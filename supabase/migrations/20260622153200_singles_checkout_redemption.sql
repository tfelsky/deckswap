-- Extend create_singles_checkout to spend Mythivex Points (MP) for a checkout credit.
--
-- The redemption runs inside the same transaction as the order creation, so if any
-- later step raises, the points are returned automatically. Limits mirror
-- lib/rewards/points.ts (REWARD_POINTS): 100 MP = $1, 500 MP minimum, and at most
-- 50% of the order may be covered by points. The server re-derives all of these —
-- the client control is a convenience, not the source of truth.

-- Adding a parameter changes the signature, so drop the old overload first to avoid
-- an ambiguous two-/three-arg pair.
drop function if exists public.create_singles_checkout(uuid, jsonb);

create or replace function public.create_singles_checkout(
  p_buyer_user_id uuid,
  p_cart_items jsonb,
  p_redeem_points integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_listing record;
  v_order_id bigint;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_discounted_subtotal numeric := 0;
  v_shipping_amount numeric := 0;
  v_tax_amount numeric := 0;
  v_grand_total numeric := 0;
  v_discount_tier_key text := 'none';
  v_discount_tier_label text := 'No volume discount yet';
  v_seller_user_id uuid := null;
  v_item_count integer := 0;
  v_line_subtotal numeric := 0;
  v_price numeric := 0;
  v_available integer := 0;
  v_shipping_method text := 'pwe_untracked';
  v_shipping_label text := 'PWE Plain White Envelope';
  v_shipping_description text := 'No tracking. Available for up to 10 cards when the order stays at $30 or less in Canada.';
  v_max_credit_usd numeric := 0;
  v_redeem_points integer := 0;
  v_points_spent integer := 0;
  v_points_credit_usd numeric := 0;
begin
  if p_buyer_user_id is null then
    raise exception 'A signed-in buyer is required.';
  end if;

  if p_cart_items is null or jsonb_typeof(p_cart_items) <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  create temporary table temp_checkout_items (
    single_inventory_item_id bigint not null,
    quantity integer not null
  ) on commit drop;

  insert into temp_checkout_items (single_inventory_item_id, quantity)
  select
    (item ->> 'singleInventoryItemId')::bigint,
    greatest(1, floor((item ->> 'quantity')::numeric))::integer
  from jsonb_array_elements(p_cart_items) item;

  delete from temp_checkout_items
  where single_inventory_item_id is null or quantity <= 0;

  if not exists (select 1 from temp_checkout_items) then
    raise exception 'Your cart does not contain any valid items.';
  end if;

  for v_item in
    select single_inventory_item_id, sum(quantity)::integer as quantity
    from temp_checkout_items
    group by single_inventory_item_id
    order by single_inventory_item_id
  loop
    select *
    into v_listing
    from public.single_inventory_items
    where id = v_item.single_inventory_item_id
    for update;

    if not found then
      raise exception 'One of the selected singles could not be found.';
    end if;

    if v_listing.marketplace_visible is distinct from true
      or v_listing.marketplace_status <> 'active'
      or coalesce(v_listing.marketplace_price_usd, 0) <= 0
      or coalesce(v_listing.marketplace_quantity_available, 0) <= 0
      or v_listing.inventory_status <> 'buy_it_now_live'
    then
      raise exception '% is no longer available for checkout.', v_listing.card_name;
    end if;

    if v_seller_user_id is null then
      v_seller_user_id := v_listing.user_id;
    elsif v_seller_user_id <> v_listing.user_id then
      raise exception 'For now, checkout supports singles from one seller at a time.';
    end if;

    v_available := greatest(0, coalesce(v_listing.marketplace_quantity_available, 0));
    if v_available < v_item.quantity then
      raise exception '% only has % copy/copies available right now.', v_listing.card_name, v_available;
    end if;

    v_price := round(coalesce(v_listing.marketplace_price_usd, 0)::numeric, 2);
    v_line_subtotal := round(v_price * v_item.quantity, 2);
    v_subtotal := round(v_subtotal + v_line_subtotal, 2);
    v_item_count := v_item_count + v_item.quantity;
  end loop;

  if v_subtotal >= 200 then
    v_discount_tier_key := 'tier_25';
    v_discount_tier_label := '25% off orders $200+';
    v_discount_amount := round(v_subtotal * 0.25, 2);
  elsif v_subtotal >= 100 then
    v_discount_tier_key := 'tier_20';
    v_discount_tier_label := '20% off orders $100+';
    v_discount_amount := round(v_subtotal * 0.20, 2);
  else
    v_discount_amount := 0;
  end if;

  v_discounted_subtotal := round(v_subtotal - v_discount_amount, 2);
  if v_subtotal > 30 or v_item_count > 10 then
    v_shipping_method := 'tracked_padded_mailer';
    v_shipping_label := 'Padded mailer with tracking';
    v_shipping_description := 'Automatic for orders over $30 or more than 10 cards in Canada.';
    v_shipping_amount := 15;
  else
    v_shipping_method := 'pwe_untracked';
    v_shipping_label := 'PWE Plain White Envelope';
    v_shipping_description := 'No tracking. Available for up to 10 cards when the order stays at $30 or less in Canada.';
    v_shipping_amount := 5;
  end if;
  v_grand_total := round(v_discounted_subtotal + v_shipping_amount + v_tax_amount, 2);

  -- Resolve any reward-point redemption against the live total, then spend the
  -- points inside this transaction. redeem_reward_points locks the balance row and
  -- raises if it is insufficient, which rolls the whole checkout back.
  if coalesce(p_redeem_points, 0) > 0 then
    v_max_credit_usd := floor(v_grand_total * 0.5);               -- max 50% of order
    v_redeem_points := least(greatest(0, p_redeem_points), (v_max_credit_usd * 100)::integer);
    v_redeem_points := (floor(v_redeem_points / 100) * 100)::integer; -- whole-dollar increments
    if v_redeem_points >= 500 then                                -- minimum redemption
      v_points_spent := public.redeem_reward_points(
        p_buyer_user_id, v_redeem_points, 'singles_order', null, 500
      );
      v_points_credit_usd := round(v_points_spent / 100.0, 2);
      v_grand_total := round(v_grand_total - v_points_credit_usd, 2);
    end if;
  end if;

  insert into public.singles_orders (
    buyer_user_id,
    seller_user_id,
    status,
    currency,
    item_subtotal_usd,
    discount_tier_key,
    discount_tier_label,
    discount_amount_usd,
    discounted_subtotal_usd,
    shipping_amount_usd,
    tax_amount_usd,
    grand_total_usd,
    item_count,
    pricing_snapshot,
    cart_snapshot
  )
  values (
    p_buyer_user_id,
    v_seller_user_id,
    'awaiting_shipment',
    'USD',
    v_subtotal,
    v_discount_tier_key,
    v_discount_tier_label,
    v_discount_amount,
    v_discounted_subtotal,
    v_shipping_amount,
    v_tax_amount,
    v_grand_total,
    v_item_count,
    jsonb_build_object(
      'subtotal', v_subtotal,
      'discountTier', v_discount_tier_key,
      'tierLabel', v_discount_tier_label,
      'discountAmount', v_discount_amount,
      'discountedSubtotal', v_discounted_subtotal,
      'shippingMethod', v_shipping_method,
      'shippingLabel', v_shipping_label,
      'shippingDescription', v_shipping_description,
      'shippingAmount', v_shipping_amount,
      'taxAmount', v_tax_amount,
      'pointsRedeemed', v_points_spent,
      'pointsCreditUsd', v_points_credit_usd,
      'grandTotal', v_grand_total
    ),
    p_cart_items
  )
  returning id into v_order_id;

  -- Backfill the redemption ledger entry's source_id now that the order exists, so
  -- it ties to the order (and dedupes against a retry of the same checkout).
  if v_points_spent > 0 then
    update public.reward_point_entries
      set source_id = v_order_id::text
      where user_id = p_buyer_user_id
        and reason = 'redemption'
        and source_type = 'singles_order'
        and source_id is null;
  end if;

  for v_item in
    select single_inventory_item_id, sum(quantity)::integer as quantity
    from temp_checkout_items
    group by single_inventory_item_id
    order by single_inventory_item_id
  loop
    select *
    into v_listing
    from public.single_inventory_items
    where id = v_item.single_inventory_item_id
    for update;

    v_price := round(coalesce(v_listing.marketplace_price_usd, 0)::numeric, 2);
    v_line_subtotal := round(v_price * v_item.quantity, 2);

    insert into public.singles_order_items (
      order_id,
      single_inventory_item_id,
      seller_user_id,
      quantity,
      unit_price_usd,
      line_subtotal_usd,
      card_name,
      set_name,
      set_code,
      collector_number,
      foil,
      condition,
      language,
      image_url,
      pricing_snapshot
    )
    values (
      v_order_id,
      v_listing.id,
      v_listing.user_id,
      v_item.quantity,
      v_price,
      v_line_subtotal,
      v_listing.card_name,
      v_listing.set_name,
      v_listing.set_code,
      v_listing.collector_number,
      coalesce(v_listing.foil, false),
      v_listing.condition,
      v_listing.language,
      v_listing.image_url,
      jsonb_build_object(
        'unitPriceUsd', v_price,
        'lineSubtotalUsd', v_line_subtotal
      )
    );

    update public.single_inventory_items
    set
      marketplace_quantity_available = marketplace_quantity_available - v_item.quantity,
      marketplace_status = case
        when marketplace_quantity_available - v_item.quantity <= 0 then 'sold_out'
        else marketplace_status
      end,
      marketplace_visible = case
        when marketplace_quantity_available - v_item.quantity <= 0 then false
        else marketplace_visible
      end,
      inventory_status = case
        when marketplace_quantity_available - v_item.quantity <= 0 then 'checked_out'
        else inventory_status
      end,
      updated_at = now()
    where id = v_listing.id;
  end loop;

  return jsonb_build_object(
    'orderId', v_order_id,
    'pointsRedeemed', v_points_spent,
    'pointsCreditUsd', v_points_credit_usd
  );
end;
$$;

grant execute on function public.create_singles_checkout(uuid, jsonb, integer) to authenticated;
