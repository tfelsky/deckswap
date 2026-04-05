# SEO Quick Report

## What changed

- Added `app/robots.ts` to generate a crawl policy and point bots to the sitemap.
- Added `app/sitemap.ts` to publish static marketing/legal URLs plus dynamic public deck, auction, and profile URLs.
- Added `lib/site.ts` so sitemap, robots, and metadata share one canonical site URL source.
- Updated `app/layout.tsx` to set `metadataBase`, a root canonical, and default Open Graph / Twitter metadata.

## robots.txt review

- `robots.txt` did not exist before this pass.
- The new policy allows crawling of public pages.
- The new policy disallows app-only or low-search-intent areas:
  - `/admin/*`
  - `/api/*`
  - auth, account, settings, order, trade workspace, and private inventory routes
  - prototype routes

## Sitemap coverage

### Included static indexable routes

| Route | Notes |
| --- | --- |
| `/` | Primary landing page |
| `/decks` | Core marketplace index |
| `/auctions` | Public auction index |
| `/info` | Trust / FAQ style content |
| `/completed-sales` | Public archive content |
| `/paper-power-9` | Campaign / content page |
| `/holiday-giveback` | Campaign / program page |
| `/compliance` | Policy hub |
| `/accessibility` | Policy page |
| `/cookies` | Policy page |
| `/privacy` | Policy page |
| `/sustainability` | Policy page |
| `/terms` | Policy page |

### Included dynamic public routes

| Route pattern | Inclusion rule |
| --- | --- |
| `/decks/[id]` | Only decks in public inventory statuses |
| `/auctions/[id]` | All auction listing detail pages returned by Supabase |
| `/u/[username]` | Profiles with a username |

### Excluded from sitemap

| Route pattern | Reason |
| --- | --- |
| `/admin/*` | Private admin surfaces |
| `/api/*` | Non-HTML endpoints |
| `/sign-in` | Utility/auth page |
| `/my-decks/*` | Private authenticated inventory |
| `/settings/*` | Private authenticated settings |
| `/orders/*` | Transaction workspace, not search landing content |
| `/trade-offers/*` | Authenticated workflow pages |
| `/trade-drafts/*` | Authenticated workflow pages |
| `/trades/*` | Authenticated workflow pages |
| `/trade-matches` | Logged-in utility flow |
| `/create-deck` | Utility flow |
| `/import-deck` | Utility flow |
| `/import-library` | Utility flow |
| `/guest-import` | Utility flow |
| `/guest-preview` | Utility flow |
| `/auction-prototype` | Prototype page |
| `/checkout-prototype` | Prototype page |

## Page-by-page SEO status

### Strong candidates to index now

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Index | Strong commercial intent and internal linking |
| `/decks` | Index | Core marketplace hub |
| `/decks/[id]` | Index | High-value detail pages if metadata is added |
| `/auctions` | Index | Public listing hub |
| `/auctions/[id]` | Index | Good long-tail potential for deck + auction queries |
| `/u/[username]` | Index | Can rank for seller / profile searches |
| `/info` | Index | Good explainer / trust content |
| `/completed-sales` | Index | Useful archive / proof content |
| `/paper-power-9` | Index | Campaign / content landing page |
| `/holiday-giveback` | Index | Campaign / mission content |
| `/compliance` | Index | Helpful trust page |
| `/accessibility` | Index | Trust / compliance page |
| `/cookies` | Index | Trust / compliance page |
| `/privacy` | Index | Trust / compliance page |
| `/sustainability` | Index | Trust / compliance page |
| `/terms` | Index | Trust / compliance page |

### Should stay out of search

| Route | Status | Notes |
| --- | --- | --- |
| `/sign-in` | Noindex via robots exclusion | Utility page |
| `/create-deck` | Noindex via robots exclusion | Utility page |
| `/import-deck` | Noindex via robots exclusion | Utility page |
| `/import-library` | Noindex via robots exclusion | Utility page |
| `/guest-import` | Noindex via robots exclusion | Utility page |
| `/guest-preview` | Noindex via robots exclusion | Utility page |
| `/my-decks` and children | Noindex via robots exclusion | Private inventory |
| `/settings/profile` | Noindex via robots exclusion | Private settings |
| `/notifications` | Noindex via robots exclusion | Private account surface |
| `/orders`, `/orders/new`, `/orders/[id]` | Noindex via robots exclusion | Transaction workflow |
| `/trade-matches` | Noindex via robots exclusion | Logged-in matching workflow |
| `/trade-offers`, `/trade-offers/propose`, `/trade-offers/[id]` | Noindex via robots exclusion | Logged-in workflow |
| `/trade-drafts/[id]` | Noindex via robots exclusion | Logged-in workflow |
| `/trades`, `/trades/[id]` | Noindex via robots exclusion | Logged-in workflow |
| `/admin/*` | Noindex via robots exclusion | Admin-only surfaces |
| `/auction-prototype` | Noindex via robots exclusion | Prototype content |
| `/checkout-prototype` | Noindex via robots exclusion | Prototype content |

## Biggest SEO gaps still open

1. Only a small set of pages currently export route-specific `metadata`.
2. Dynamic SEO is missing for high-value pages like `/decks/[id]`, `/auctions/[id]`, and `/u/[username]`.
3. Several important public pages rely on the root layout title/description instead of page-specific copy.
4. No explicit `noindex` metadata exists for utility/auth pages; crawl blocking helps, but route metadata would be cleaner.
5. Public detail pages would benefit from richer titles, descriptions, canonical paths, and share images.

## Recommended next SEO pass

1. Add `generateMetadata` for `/decks/[id]`, `/auctions/[id]`, and `/u/[username]`.
2. Add route-specific metadata to `/info`, `/decks`, `/auctions`, `/completed-sales`, `/privacy`, `/terms`, `/paper-power-9`, and `/holiday-giveback`.
3. Add explicit `robots` metadata with `index: false` for auth, app, and prototype pages.
4. Add structured data for marketplace items, profiles, and FAQs where appropriate.
