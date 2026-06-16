# Campaigns

Marketing assets for the Mythiverse Exchange / DeckSwap launch. Not app code — these don't ship with the build; they're source assets for social and press.

## Contents

### `instagram-stories/` — 5 story graphics (1080×1920, 9:16)
One per core differentiator. Built as SVG so they're editable and resolution-independent; export to PNG/JPG before posting.

| File | Feature | Accent |
|---|---|---|
| `01-whole-deck-marketplace.svg` | Whole-deck market (value preservation vs. buylist) | Emerald |
| `02-import-to-listing.svg` | Import → validate → enrich → list pipeline | Cyan |
| `03-deck-swap-two-lanes.svg` | Deck-for-deck swap: escrow vs. direct shipping | Emerald + Gold |
| `04-deck-optimizer.svg` | Upload a deck, ranked upgrade "buying tree" | Gold |
| `05-trust-and-verification.svg` | Verified profiles, reputation, bracket signals | Blue + Emerald |

**Design notes:** brand colors pulled from `app/globals.css` (primary emerald `#2fd4a0`, accent gold `#e3b54a`, deep-navy base). Each story carries a **WUBRG mana signature strip** under the wordmark — the same five mana-color gradients used by the site's color-chooser widget (`MANA_SWATCHES` in `app/page.tsx`) — so the assets read unmistakably as Mythiverse Exchange. Live domain `mythivex.com` is baked into the CTAs. Content sits inside Instagram's story-safe zone (top ~250px and bottom ~250px kept clear of critical text for the IG UI and reply bar). Swap the swipe-up CTAs for real link stickers before scheduling.

### Press / "route to make news"
| File | Purpose |
|---|---|
| `press-release.md` | Launch press release. Fill the `[BRACKETS]` (city, date, spokesperson, URL, contact) before sending. |
| `media-target-list.md` | Prioritized outlet/creator list, sequencing, and a 2-week launch plan. |
| `pitch-email.md` | Cold-pitch templates: press, creators, community, and a follow-up. |

## Exporting the stories to PNG

The SVGs are self-contained (no external fonts/images), so any of these work:

```bash
# ImageMagick
magick -background none -density 144 01-whole-deck-marketplace.svg 01-whole-deck-marketplace.png

# rsvg-convert (sharper text)
rsvg-convert -w 1080 -h 1920 01-whole-deck-marketplace.svg -o 01-whole-deck-marketplace.png
```

Or open in a browser and screenshot at 1080×1920. For posting, batch-export all five at 1080×1920.

## Before you publish — checklist
- [ ] Replace every `[BRACKET]` placeholder in the press files.
- [ ] Swap the placeholder domain for the live URL.
- [ ] Export stories to PNG and spot-check text isn't clipped by the IG UI on a real phone.
- [ ] Confirm the Wizards of the Coast trademark disclaimer is present (it's in the press release).
- [ ] Personalize each pitch — no mass blasts.
