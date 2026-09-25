# Supabase Cloud Setup for Dealzy

Dealzy V1.5 is prepared for Supabase Auth + cloud synchronization.

## Required Vercel environment variables
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Do not commit secret service-role keys to this repository.

## Database
Run `supabase/schema.sql` in the Supabase SQL editor.

The table uses Row Level Security so authenticated users can only read or write their own Dealzy JSON data.

## API endpoints
- `/api/cloud-status` — reports whether Supabase env variables are configured.
- `/api/auth` — signup/login/refresh proxy.
- `/api/sync` — read/write the authenticated user's Dealzy data.

## Synced fields
The client can sync local favorites, trips, alerts, profile, price watches, coupons and tool preferences as one user-owned JSON document.

## Production checklist
- Enable email confirmation if desired.
- Add the production Dealzy URL to Supabase Auth URL configuration.
- Add Google OAuth later if wanted.
- Configure rate limiting / abuse protection before a public launch.
