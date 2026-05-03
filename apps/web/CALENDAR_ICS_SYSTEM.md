# Scalable ICS (iCalendar) import/export

This complements the existing **`property_ical_sources`** + **`property_availability`** model with UID-based incremental sync and bounded DB IO suitable for thousands of listings.

## 1. Run SQL in Supabase

Execute (in order, after **`SUPABASE_ICAL_SYNC.sql`** is already applied):

1. **`apps/web/SUPABASE_CALENDAR_ICS_SCALE.sql`**

This adds:

- **`property_ical_sources`**: `last_hash`, `sync_status ('active' | 'failed')`, `last_manual_sync_at`
- **`calendar_import_bookings`**: one row per **ICS UID** (+ date range); **UPSERT + orphan delete**, **no full wipe**
- **VIEW `external_calendars`**: alias over `property_ical_sources`
- **`calendar_delete_import_orphans(...)`**: single DELETE for vanished UIDs in a bounded window (service_role only)
- **`calendar_refresh_ical_availability(...)`**: deletes + inserts only **ical-sync** / `room_id`-null rows in **`[p_from,p_to)`** (service_role only)

> **Naming note:** Guest reservations remain in **`bookings`** (VibesBNB product table). Imported platform stays live in **`calendar_import_bookings`** so we do not collide with the existing **`bookings`** table.

### `end_date` semantics

Imported rows store **`start_date`** (first occupied night) and **`end_date`** (**iCal-exclusive checkout morning** — aligned with **`bookings` / availability** writers in this repo).

---

## 2. Environment variables

| Variable | Purpose |
|---------|---------|
| `CALENDAR_CRON_SECRET` | Shared secret for `POST /api/cron/calendar-sync-batch` (Bearer or `x-cron-secret`). Falls back to `CRON_SECRET` if unset. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for cron + reliable sync writes. |
| `NEXT_PUBLIC_APP_URL` | Used for ICS URLs in the dashboard; Edge optional proxy uses this too. |

---

## 3. HTTP endpoints (Next.js App Router)

| Method | Path | Behaviour |
|--------|------|-------------|
| `GET` | **`/calendar/:propertyId.ics?token=...`** → rewrites to **`/api/calendar/:propertyId/ics`** | Export **next 6 months** of occupancy, **`Cache-Control: max-age=300`**. |
| `POST` | **`/calendar/:propertyId/sync`** (host auth) | Manual sync for all feeds; **120s** cooldown (`last_manual_sync_at`). |
| `POST` | **`/api/cron/calendar-sync-batch`** | **≤50** feeds / call; prefers failed feeds first. |
| Legacy | **`/api/properties/:id/ical/export?token=...`** | Still supported. |

Host **`GET /api/host/properties/:id/ical`** returns **`sync_status`**, **`last_hash`**, **`last_manual_sync_at`**.

---

## 4. Scheduling

**Vercel Cron** (`apps/web/vercel.json`): every **10 minutes** → `/api/cron/calendar-sync-batch` — set **`Authorization: Bearer <secret>`** in the cron configuration / env where your host injects headers.

Alternatively, deploy **`supabase/functions/calendar-sync-worker`** pointing `CALENDAR_CRON_HOOK_URL` at the same API route.

---

## 5. Import performance summary

Per feed in **[today UTC, today+6mo)**:

1. Hash ICS body → **skip all DB writes** when unchanged.
2. Parse **`VEVENT`** (`node-ical`); recurrence ignored v1.
3. **Upsert `calendar_import_bookings`** in chunks (~200 rows).
4. **One RPC** deletes orphan UIDs in-window.
5. **One RPC** refreshes **`property_availability`** for that **`ical_source_id`** in-window only — avoids per-day client round-trips.

---

## 6. Optional Edge proxies

See **`supabase/functions/calendar-sync-worker`** and **`supabase/functions/calendar-export`** (thin HTTP wrappers).
