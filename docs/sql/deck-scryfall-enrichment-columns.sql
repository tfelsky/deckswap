alter table public.deck_cards
  add column if not exists scryfall_id text,
  add column if not exists oracle_id text,
  add column if not exists image_url text,
  add column if not exists finishes text[] not null default '{}',
  add column if not exists oracle_text text,
  add column if not exists type_line text,
  add column if not exists rarity text,
  add column if not exists mana_cost text,
  add column if not exists is_legendary boolean,
  add column if not exists is_background boolean,
  add column if not exists can_be_commander boolean,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists partner_with_name text,
  add column if not exists color_identity text[] not null default '{}',
  add column if not exists price_usd numeric,
  add column if not exists price_usd_foil numeric,
  add column if not exists price_usd_etched numeric,
  add column if not exists price_eur numeric,
  add column if not exists price_eur_foil numeric,
  add column if not exists price_tix numeric;

alter table public.deck_tokens
  add column if not exists scryfall_id text,
  add column if not exists oracle_id text,
  add column if not exists image_url text,
  add column if not exists finishes text[] not null default '{}',
  add column if not exists type_line text;
