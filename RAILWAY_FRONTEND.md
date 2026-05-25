# Railway Frontend Deploy

This repository is configured to deploy the React/Vite frontend to Railway.

## Railway settings

Use the repository root as the Railway root directory.

Railway will read `railway.json`:

- Build command: `cd project && npm ci && npm run build`
- Start command: `cd project && npm run start:railway`
- Healthcheck path: `/`

The production server is `project/scripts/serve-frontend.mjs`, a small Node static server that serves `project/dist` and falls back to `index.html` for SPA routes.

## Required variables

Add these in Railway > Service > Variables:

```env
VITE_SUPABASE_URL=https://vbhjtpjjwxelxzvixjfo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lE7cTUpGPzY-1isZAzmzSw_BpqO6MoE
VITE_API_URL=https://vbhjtpjjwxelxzvixjfo.supabase.co/functions/v1/api
```

If the API remains on another Railway backend service, set `VITE_API_URL` to that backend public URL instead.

## Backend config backup

The previous Railway backend config was saved as `railway.backend.json`.
