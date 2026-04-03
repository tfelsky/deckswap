# User Profile And Reputation Roadmap

## Goal

Add a first-class user profile system that supports:

- public reputation and marketplace trust signals
- private shipping and customer-service information
- identity and attestation workflows
- marketplace links and external reputation references
- marketing preferences and support metadata

## Recommended Product Split

Separate this into three layers instead of one overloaded profile object:

1. Public profile
2. Private account profile
3. Verification and reputation records

That keeps shipping and compliance data private while still letting buyers and traders see trust signals.

## Recommended Tables

### `profiles`

One row per authenticated user. Public-facing marketplace identity.

Suggested columns:

- `user_id uuid primary key references auth.users(id)`
- `display_name text`
- `username text unique`
- `bio text`
- `avatar_url text`
- `location_country text`
- `location_region text`
- `preferred_currency text`
- `preferred_language text`
- `marketplace_tagline text`
- `website_url text`
- `instagram_url text`
- `x_url text`
- `youtube_url text`
- `whatnot_url text`
- `ebay_url text`
- `cardmarket_url text`
- `tcgplayer_url text`
- `can_ship_domestic boolean default true`
- `can_ship_international boolean default false`
- `profile_visibility text default 'public'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `profile_private`

Private operational and shipping data. Never shown publicly.

Suggested columns:

- `user_id uuid primary key references auth.users(id)`
- `legal_first_name text`
- `legal_last_name text`
- `support_email text`
- `support_phone text`
- `shipping_name text`
- `shipping_company text`
- `shipping_address_line_1 text`
- `shipping_address_line_2 text`
- `shipping_city text`
- `shipping_region text`
- `shipping_postal_code text`
- `shipping_country text`
- `return_address_same_as_shipping boolean default true`
- `return_name text`
- `return_company text`
- `return_address_line_1 text`
- `return_address_line_2 text`
- `return_city text`
- `return_region text`
- `return_postal_code text`
- `return_country text`
- `customer_service_notes text`
- `marketing_opt_in_email boolean default false`
- `marketing_opt_in_sms boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `profile_verifications`

Structured trust and compliance statuses.

Suggested columns:

- `id bigserial primary key`
- `user_id uuid references auth.users(id)`
- `verification_type text`
- `status text`
- `provider text`
- `provider_reference text`
- `submitted_at timestamptz`
- `reviewed_at timestamptz`
- `expires_at timestamptz`
- `notes text`
- `created_at timestamptz default now()`

Examples of `verification_type`:

- `email_verified`
- `phone_verified`
- `shipping_address_verified`
- `government_id_uploaded`
- `government_id_verified`
- `selfie_attestation`
- `seller_attestation`
- `high_value_trade_enabled`

### `profile_attestations`

User-acknowledged policy statements and marketplace promises.

Suggested columns:

- `id bigserial primary key`
- `user_id uuid references auth.users(id)`
- `attestation_type text`
- `version text`
- `accepted_at timestamptz default now()`
- `ip_address text`

Examples:

- authenticity attestation
- shipping-window attestation
- condition-grading attestation
- chargeback / dispute policy acknowledgment

### `profile_marketplace_links`

External marketplace reputation references.

Suggested columns:

- `id bigserial primary key`
- `user_id uuid references auth.users(id)`
- `platform text`
- `profile_url text`
- `handle text`
- `is_verified boolean default false`
- `verified_at timestamptz`
- `rating_value numeric`
- `rating_count integer`
- `notes text`

Suggested platforms:

- `tcgplayer`
- `cardmarket`
- `ebay`
- `whatnot`
- `facebook`
- `discord`
- `instagram`

### `profile_reputation_summary`

Cached trust summary for fast rendering on deck pages and profiles.

Suggested columns:

- `user_id uuid primary key references auth.users(id)`
- `reputation_score numeric`
- `completed_trades_count integer`
- `successful_shipments_count integer`
- `claim_rate numeric`
- `late_shipment_rate numeric`
- `avg_response_hours numeric`
- `positive_feedback_count integer`
- `negative_feedback_count integer`
- `external_rating_count integer`
- `external_rating_average numeric`
- `verification_badges text[]`
- `updated_at timestamptz default now()`

## Recommended UI Surfaces

### Public profile page

Route:

- `/u/[username]`

Show:

- display name
- bio
- avatar
- country/region
- verification badges
- reputation summary
- external marketplace links
- active decks/listings

### Private settings page

Route:

- `/settings/profile`

Tabs:

- Public Profile
- Shipping
- Verification
- Marketplace Links
- Notifications

### Deck detail trust panel

On each deck page, add a seller card showing:

- seller display name
- reputation score
- completed trades
- verification badges
- ship-from region
- response expectations

## Recommended Build Order

### Phase 1

Basic profile foundation.

- create `profiles`
- create `profile_private`
- add `/settings/profile`
- allow user to edit display name, bio, avatar, and shipping address
- show seller name on deck pages

### Phase 2

Trust and reputation basics.

- create `profile_verifications`
- create `profile_marketplace_links`
- add verification badges
- add external marketplace links to public profile
- show seller trust panel on deck pages

### Phase 3

Operational reputation.

- create `profile_reputation_summary`
- derive internal score from completed trades and support outcomes
- expose reputation score and counts publicly

### Phase 4

Compliance and higher-trust trading.

- add ID upload flow
- add attestation records
- gate higher-value trades behind stronger verification

## Privacy Rules

Public:

- display name
- avatar
- bio
- seller region
- verification badges
- marketplace links
- reputation summary

Private:

- legal name
- street address
- phone
- support notes
- uploaded identity materials
- attestation audit data

## Operational Notes

- Do not store raw identity documents in the main relational tables. Store file metadata only, and keep uploaded files in protected object storage.
- Keep public profile editing and private shipping editing separate in the UI.
- Treat verification as a status system, not a single boolean.
- Cache reputation summary for rendering, then recompute from source events later.

## Immediate Recommendation

The next smallest useful step is:

1. create `profiles`
2. create `profile_private`
3. add `/settings/profile`
4. show seller display name and ship-from region on deck pages

That gives you a real user system now, while leaving room for ID verification and reputation scoring later.
