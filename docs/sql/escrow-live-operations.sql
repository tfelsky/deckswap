alter table public.trade_transactions
  add column if not exists payment_requested_at timestamptz,
  add column if not exists release_ready_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists dispute_reason text;

alter table public.trade_transaction_participants
  add column if not exists payment_marked_at timestamptz,
  add column if not exists shipment_status text not null default 'not_shipped',
  add column if not exists tracking_code text,
  add column if not exists packaging_addon_usd numeric not null default 0,
  add column if not exists label_box_requested boolean not null default false,
  add column if not exists shipped_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists inspection_status text not null default 'pending',
  add column if not exists inspection_notes text;

alter table public.trade_transaction_participants
  drop constraint if exists trade_transaction_participants_shipment_status_check;

alter table public.trade_transaction_participants
  add constraint trade_transaction_participants_shipment_status_check
  check (shipment_status in ('not_shipped', 'shipped', 'received'));

alter table public.trade_transaction_participants
  drop constraint if exists trade_transaction_participants_inspection_status_check;

alter table public.trade_transaction_participants
  add constraint trade_transaction_participants_inspection_status_check
  check (inspection_status in ('pending', 'passed', 'failed'));

drop policy if exists "trade creator and admin update trades"
  on public.trade_transactions;

create policy "trade participants, creator, and admin update trades"
  on public.trade_transactions
  for update
  using (
    created_by = auth.uid()
    or auth.jwt() ->> 'email' = 'tim.felsky@gmail.com'
    or exists (
      select 1
      from public.trade_transaction_participants p
      where p.transaction_id = id
        and p.user_id = auth.uid()
    )
  )
  with check (
    created_by = auth.uid()
    or auth.jwt() ->> 'email' = 'tim.felsky@gmail.com'
    or exists (
      select 1
      from public.trade_transaction_participants p
      where p.transaction_id = id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "trade creator and admin update participant rows"
  on public.trade_transaction_participants;

create policy "participants, creator, and admin update participant rows"
  on public.trade_transaction_participants
  for update
  using (
    user_id = auth.uid()
    or auth.jwt() ->> 'email' = 'tim.felsky@gmail.com'
    or exists (
      select 1
      from public.trade_transactions t
      where t.id = transaction_id
        and t.created_by = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or auth.jwt() ->> 'email' = 'tim.felsky@gmail.com'
    or exists (
      select 1
      from public.trade_transactions t
      where t.id = transaction_id
        and t.created_by = auth.uid()
    )
  );

drop policy if exists "trade creator inserts events"
  on public.escrow_events;

create policy "trade participants, creator, and admin insert events"
  on public.escrow_events
  for insert
  with check (
    auth.jwt() ->> 'email' = 'tim.felsky@gmail.com'
    or exists (
      select 1
      from public.trade_transactions t
      where t.id = transaction_id
        and (
          t.created_by = auth.uid()
          or exists (
            select 1
            from public.trade_transaction_participants p
            where p.transaction_id = t.id
              and p.user_id = auth.uid()
          )
        )
    )
  );
