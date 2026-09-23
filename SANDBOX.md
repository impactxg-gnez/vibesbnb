# VibesBNB testing sandbox

Long-lived `sandbox` branch + Vercel Preview URL, pointed at a **separate Supabase project**. Production (`main` → vibesbnb.com) stays isolated.

```
feature branch  →  sandbox  →  Vercel Preview  →  sandbox Supabase
                      ↓
                 PR to main  →  Vercel Production  →  prod Supabase
```

## How to use it

1. Branch from `sandbox` (or merge a feature branch into `sandbox`).
2. Push `sandbox`. Vercel deploys a Preview.
3. Test on the Preview URL against sandbox data.
4. When the feature is good, open a PR `sandbox` → `main` (or cherry-pick). Do not push feature work straight to `main`.

Do not develop on `main`. Do not point sandbox env vars at production Supabase, Stripe **live** keys, or PayPal **live** credentials.

## Vercel Preview alias

Production stays on `main` for project `vibesbnb-web` (root directory `apps/web`).

After the first `sandbox` push, Vercel creates a Preview such as:

`https://vibesbnb-web-git-sandbox-<team>.vercel.app`

Give testers a stable URL:

1. Vercel → project → **Settings → Domains**.
2. Assign `sandbox.vibesbnb.com` (or keep the `*-git-sandbox-*` URL) to the **`sandbox` git branch**, environment **Preview**.
3. Set Preview `NEXT_PUBLIC_APP_URL` to that exact origin (no trailing slash).

Confirm **Preview deployments** are enabled for the GitHub repo. Do **not** enable the production calendar cron (`/api/cron/calendar-sync-batch` in root `vercel.json`) on Preview. Production-only crons stay on Production.

## Isolated Supabase

Create a second project, e.g. `vibesbnb-sandbox`. Copy **schema**, not live guest/host/payment rows.

### Schema (SQL Editor)

Run, in order, on the empty sandbox project:

1. [`apps/web/SUPABASE_00_SCHEMA_BOOTSTRAP.sql`](apps/web/SUPABASE_00_SCHEMA_BOOTSTRAP.sql)
2. Remaining `apps/web/SUPABASE_*.sql` files that add columns, RLS, or RPCs.

Skip destructive or check-only scripts:

- `SUPABASE_DELETE_ALL_PROPERTIES.sql`
- `SUPABASE_CLEAR_ALL_BOOKINGS.sql`
- `SUPABASE_TEST_INSERT.sql`
- `SUPABASE_ROLLBACK_00_02.sql`
- `SUPABASE_CHECK_PROPERTIES.sql`
- `SUPABASE_CHECK_RLS_POLICIES.sql`

Also apply storage/auth helpers if you need uploads or email:

- `SUPABASE_STORAGE_SETUP.sql`
- `SUPABASE_AUTH_EMAIL_SETUP.sql`

Edge functions under `supabase/functions/` are optional; do not deploy them against production.

### Seed

Do not clone production users or bookings.

1. Sign up a test guest and a test host on the Preview URL (or locally with sandbox keys).
2. Approve the host in the sandbox admin tools if your flow requires it.
3. Create 2–3 listings in Miami (include at least one with cannabis indoor/outdoor flags and one without) so `/miami` and `/miami/420-friendly` can be tested.
4. Optionally add a patio/balcony amenity on one listing.

### Preview environment variables

In Vercel, set these on the **Preview** environment only (not Production). That also keeps future PR previews off the live database.

See [`apps/web/.env.sandbox.example`](apps/web/.env.sandbox.example). Minimum:

| Variable | Sandbox value |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | `sandbox` |
| `NEXT_PUBLIC_APP_URL` | Preview / alias origin |
| `NEXT_PUBLIC_SUPABASE_URL` | sandbox project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sandbox anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | sandbox service role |
| Stripe / PayPal | **test** keys only |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | OK to reuse if the key allows the sandbox origin |

Never set production `CALENDAR_CRON_SECRET` on Preview.

## Local development against sandbox data

```bash
cp apps/web/.env.sandbox.example apps/web/.env.local
# fill in sandbox keys
npm run dev
```

`npm run dev` is the fast loop. Push to `sandbox` when you need a shareable URL.

## Indexing and jobs

Preview/sandbox is `noindex` (`robots.ts`, metadata, and middleware `X-Robots-Tag`). The sitemap is empty on Preview. Production still emits `index, follow` when `VERCEL_ENV=production` (robots.txt, metadata, and the same middleware header). Do not put a blanket `X-Robots-Tag: index, follow` in `vercel.json` — that would also apply to Preview.

A site banner reads **Sandbox — not production** when `NEXT_PUBLIC_APP_ENV=sandbox` or `VERCEL_ENV=preview`.
