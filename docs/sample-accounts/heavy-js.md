# Heavy J's Card House sample account

Heavy J's Card House is configured as a Sarnia store sample account for Mythiverse Exchange and PodMatch demos. The public store details below come from `heavyjs.com`.

## Account data

- Display name: Heavy J's Card House
- Username: `heavy-js-card-house-sarnia`
- Default login email: `heavy-js.sample@mythivex.test`
- Public contact email: not listed on the fetched page
- Phone: not listed on the fetched page
- Website: `https://heavyjs.com/`
- Location: Sarnia, Ontario, Canada
- Address: 208 Front St N Unit 1, Sarnia, ON N7T 5S5
- Currency: CAD
- Sample use cases: Magic singles, Pokemon singles, Lorcana singles, One Piece singles, sealed products, buylist, and events
- PodMatch league: Heavy J's Commander League
- PodMatch invite code: `heavyjs`
- Seeded calendar: four upcoming weekly TCG event-night entries
- Calendar model: `Weekly TCG Event Night`
- Event invite-code prefix: `hjevent`

## Research basis

- `heavyjs.com` lists the store name as Heavy J's Card House.
- The site lists the store address as 208 Front St N Unit 1, Sarnia, ON N7T 5S5.
- The site exposes Home, Contact Us, Buylist, Store Information, and Events navigation.
- The homepage lists Magic Singles, Pokemon Singles, Lorcana Singles, One Piece Card Game Singles, and sealed product categories.
- The fetched public page did not expose exact event rows, so the seeded calendar is a sample shell based on the public Events/Upcoming Events surface and TCG categories.
- The seed keeps the auth login email on `mythivex.test` by default to avoid controlling or sending auth mail to a real store inbox.

## Seed command

Set Supabase admin credentials and a password outside git, then run:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://..."
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:SAMPLE_STORE_PASSWORD="..."
npm run seed:heavy-js
```

Override the default sample email when needed:

```powershell
$env:SAMPLE_STORE_EMAIL="partners+heavy-js@mythivex.com"
```
