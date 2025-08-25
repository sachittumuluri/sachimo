# One‑Line‑A‑Day (Magic‑Link Surprise Ready)

## 1) Supabase
- Settings → API → copy Project URL + anon key (already filled in .env example)
- SQL Editor → run `supabase.sql` to create tables + RLS

## 2) Env
Copy `.env.local.example` → `.env.local` and fill values. For production, set all envs in Vercel:
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only; never NEXT_PUBLIC)
- COUPLE_EMAILS (CSV of the two emails)
- BASIC_AUTH_USER / BASIC_AUTH_PASS

## 3) Surprise endpoint (no email sent)
POST `/api/surprise` with `{ "email": "<one of couple emails>" }` → returns `{ link, pairId }`.
It will ensure both users exist, create a private pair if needed, and return a one‑time magic link that redirects to your site.

Example:
```bash
curl -X POST https://sachandsimo.love/api/surprise   -H "Content-Type: application/json"   -d '{"email":"simonechariell@gmail.com"}'
```

Open the returned link on her phone to sign her in instantly 💫