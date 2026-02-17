# VENYOU

Find your venue. See where everyone's heading. Check in with one tap.

## Stack

- **React 19** + TypeScript
- **Vite 7** (build + dev server)
- **Tailwind CSS 4**
- **Supabase** (auth, database, realtime)
- **Mapbox GL** (interactive map)
- **Capacitor 8** (iOS + Android)

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
