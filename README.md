# venuu

your cheat code for nightlife

## Stack

- **React 19** + TypeScript
- **Vite 7** (build + dev server)
- **Tailwind CSS 4**
- **Supabase** (auth, database, realtime)
- **Mapbox GL** (interactive map)
- **Capacitor 8** (iOS + Android)

## Features

- **Live Map** — real-time venue bubbles with crowd counts
- **Bouncer Portal** — door staff clicker for live headcounts
- **Check-ins** — tap to say you're going
- **City Chat** — real-time city-wide chat
- **Data Hierarchy** — bouncer headcount > self-reported checkins

## Setup

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### Required env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`
