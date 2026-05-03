# `sync-calendars` Edge Function

Scalable ICS import: selects **50** active feeds ordered by **`last_synced_at ASC NULLS FIRST`**, hashes remote ICS to skip unchanged files, then **bulk upserts** `calendar_import_bookings` (**100-row chunks**) with **`onConflict: external_calendar_id,external_id`** (composite required; `external_id` alone is not unique across properties).

## Secrets (Supabase Dashboard → Project → Edge Functions → `sync-calendars`)

| Secret | Description |
|--------|--------------|
| `SYNC_CALENDARS_SECRET` | Random string; caller sends `Authorization: Bearer <secret>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Usually auto-available; required for RPC + bypass RLS |
| `SUPABASE_URL` | Usually auto-available |

Deploy:

```bash
supabase functions deploy sync-calendars --no-verify-jwt
```

Invoke manually:

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/sync-calendars" \
  -H "Authorization: Bearer $SYNC_CALENDARS_SECRET" \
  -H "Content-Type: application/json"
```

## Cron (every 10 minutes)

**Option A — Supabase Dashboard**

Edge Functions → `sync-calendars` → Schedules → add `*/10 * * * *` (cron) pointing at this function, with the Bearer secret configured if the UI supports it.

**Option B — `pg_cron` + `pg_net`** (requires extensions enabled)

Replace `<PROJECT_REF>` and secrets:

```sql
select
  cron.schedule(
    'sync-calendars-10min',
    '*/10 * * * *',
    $$
    select
      net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-calendars',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', format('Bearer %s', '<PASTE_SYNC_CALENDARS_SECRET>')
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
  );
```

**Note:** Quote the Bearer token carefully in SQL; prefer storing via Vault or escaping.

## Example logs (stdout JSON Lines)

Single-line structured logs (`console.log(JSON.stringify(...))`):

```json
{"ts":"2026-04-27T12:00:00.000Z","fn":"sync-calendars","phase":"batch_start","level":"info"}
{"ts":"2026-04-27T12:00:00.050Z","fn":"sync-calendars","phase":"batch_loaded","count":50}
{"ts":"2026-04-27T12:00:01.123Z","fn":"sync-calendars","calendarId":"…","propertyId":"…","phase":"hash_skip","ms":89}
{"ts":"2026-04-27T12:00:04.412Z","fn":"sync-calendars","calendarId":"…","propertyId":"…","phase":"sync_done","events":14,"ms":2103}
{"ts":"2026-04-27T12:00:05.901Z","fn":"sync-calendars","calendarId":"…","propertyId":"…","phase":"error","error":"ICS HTTP 403","ms":982,"level":"error"}
{"ts":"2026-04-27T12:00:10.001Z","fn":"sync-calendars","phase":"batch_complete","ok":true,"processed":50,"succeeded":12,"hash_skipped":35,"failed":3,"results":[]}
```

## Prerequisites SQL

Apply `apps/web/SUPABASE_CALENDAR_ICS_SCALE.sql` so **`external_calendars`**, **`calendar_import_bookings`**, **`calendar_delete_import_orphans`**, and **`calendar_refresh_ical_availability`** exist.

## Performance

| Mechanism | Why |
|-----------|-----|
| `last_hash` short-circuit | No parse/UPSERT RPC when ICS body unchanged (**only updates `last_synced_at`**). |
| Upsert batches of 100 | Few round-trips vs single-row inserts. |
| Parallelism ≤ 5 | Limits concurrent outbound ICS fetches. |
| Orphan DELETE + RPC refresh | Bounded window; avoids loading all bookings into the Edge runtime. |

No direct `SELECT` on guest `bookings` in this function — availability reconciliation is delegated to Postgres RPCs.
