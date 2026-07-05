-- NOTE: Folded into supabase/migrations/20260622153000_escrow_payment_intents.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

-- Payment-intent placeholder fields on escrow participants. These capture the
-- chosen payment method and a placeholder intent id/status/amount so the
-- escrow flow is shaped for a real payment provider later.

alter table public.trade_transaction_participants
  add column if not exists payment_method text,
  add column if not exists payment_intent_id text,
  add column if not exists payment_intent_status text,
  add column if not exists payment_authorization_amount_usd numeric;

alter table public.trade_transaction_participants
  drop constraint if exists trade_participants_payment_method_check;
alter table public.trade_transaction_participants
  add constraint trade_participants_payment_method_check
  check (payment_method is null or payment_method in ('card', 'bank_transfer'));

alter table public.trade_transaction_participants
  drop constraint if exists trade_participants_payment_intent_status_check;
alter table public.trade_transaction_participants
  add constraint trade_participants_payment_intent_status_check
  check (
    payment_intent_status is null
    or payment_intent_status in (
      'requires_payment_method',
      'requires_confirmation',
      'processing',
      'succeeded',
      'canceled',
      'refunded'
    )
  );
