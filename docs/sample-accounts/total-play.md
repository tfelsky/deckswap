# Total Play sample account

Total Play is configured as a Sarnia store sample account for Mythiverse Exchange and PodMatch demos. The public store details below come from `totalplay.ca`.

## Account data

- Display name: Total Play
- Username: `total-play-sarnia`
- Default login email: `total-play.sample@mythivex.test`
- Public contact email: `sales@totalplay.ca`
- Phone: `5194910919`
- Website: `https://totalplay.ca/`
- Location: Sarnia, Ontario, Canada
- Address: 415 Exmouth Street, Unit 103, Sarnia, Ontario N7T 5P1
- Currency: CAD
- Sample use cases: TCG singles, sealed product, retro games, grading, buy-sell-trade, and events
- PodMatch league: Total Play Commander League
- PodMatch invite code: `totalplay`
- Seeded calendar: four upcoming Friday Night Magic casual Commander events
- Calendar model: `Friday Night Magic: Casual Commander`
- Event invite-code prefix: `tpcomm`

## Research basis

- `totalplay.ca` lists the store address as 415 Exmouth Street, Unit 103, Sarnia, Canada, N7T 5P1.
- The contact page lists phone `5194910919` and email `sales@totalplay.ca`.
- The homepage and navigation list TCG Singles for Magic the Gathering, Pokemon, Bandai titles, Yu-Gi-Oh!, Disney Lorcana, video game consoles, portable video games, events, and grading.
- The contact page lists hours as closed Monday and Tuesday, open Wednesday through Saturday 12-6PM, and open Sunday 12-6PM.
- The seeded Friday Night Magic calendar uses the supplied operating assumption that Total Play FNM is Casual Commander.
- The seed keeps the auth login email on `mythivex.test` by default to avoid controlling or sending auth mail to the store's real public inbox.

## Seed command

Set Supabase admin credentials and a password outside git, then run:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://..."
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:SAMPLE_STORE_PASSWORD="..."
npm run seed:total-play
```

Override the default sample email when needed:

```powershell
$env:SAMPLE_STORE_EMAIL="partners+total-play@mythivex.com"
```
