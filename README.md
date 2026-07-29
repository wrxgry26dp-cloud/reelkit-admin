# ReelKit Admin

Management console for the ReelKit short-drama platform.

## Stack

- Nuxt 4 + Vue 3 + `@nuxtjs/supabase`
- Shared Supabase project: `https://pssggtorqkdvxoxwsoaf.supabase.co`
- Vercel deploy on push to `main`

## Setup

1. Copy `.env.example` to `.env` and set `SUPABASE_URL` / `SUPABASE_KEY`
2. `npm install`
3. `npm run dev` (port 3001)

## Admin access

Sign up / OTP login creates a `profiles` row with `role=user`. Promote an admin in Supabase SQL:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## Features (MVP)

- Dashboard counts
- Dramas CRUD + cover upload (`posters` bucket)
- Episodes management
- Categories
- Home sections + section items
