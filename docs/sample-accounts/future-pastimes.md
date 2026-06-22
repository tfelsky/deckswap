# Future Pastimes sample account

Future Pastimes is configured as a Sarnia local-game-store sample account for Mythiverse Exchange and PodMatch demos. The public store details below come from `futurepastimes.ca`.

## Account data

- Display name: Future Pastimes
- Username: `future-pastimes-sarnia`
- Default login email: `future-pastimes.sample@mythivex.test`
- Public contact email: `futurepastimes@hotmail.com`
- Phone: `(519) 383-6967`
- Website: `https://futurepastimes.ca/`
- Location: Sarnia, Ontario, Canada
- Address: 188 Front Street North, Sarnia, Ontario N7T 5S3, Canada
- Currency: CAD
- Sample use cases: Commander nights, singles pickup, comic pull-box operations, LGS TV, PodMatch events
- PodMatch league: Future Pastimes Commander League
- PodMatch invite code: `futurefp`
- Seeded calendar: four upcoming Friday Night Magic draft events
- Calendar model: `Friday Night Magic: Latest Set Draft`
- Event invite-code prefix: `fpdraft`

## Research basis

- `futurepastimes.ca` lists the store address as 188 Front Street North, Sarnia, Ontario N7T 5S3, Canada.
- `futurepastimes.ca` lists phone `(519) 383-6967`, Facebook Messenger `Future Pastimes`, and email `futurepastimes@hotmail.com`.
- The site showed hours of `10:00 a.m. - 10:00 p.m.` on the checked day.
- The seeded Friday Night Magic calendar uses the supplied operating assumption that Future Pastimes FNM is latest set draft.
- The seed keeps the auth login email on `mythivex.test` by default to avoid controlling or sending auth mail to the store's real public inbox.

## Seed command

Set Supabase admin credentials and a password outside git, then run:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://..."
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:SAMPLE_STORE_PASSWORD="..."
npm run seed:future-pastimes
```

Override the default sample email when needed:

```powershell
$env:SAMPLE_STORE_EMAIL="partners+future-pastimes@mythivex.com"
```
