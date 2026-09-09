# Accessibility (WCAG 2.2 AA + DOJ lodging)

## Apply database migration

Run in Supabase SQL Editor:

`apps/web/SUPABASE_ACCESSIBILITY_FEATURES.sql`

This adds `accessibility_description`, `adapted_status`, `image_alts`, proof table, and `hold_booking_nights_atomic`.

## Manual checks

1. Keyboard: Tab through home → search → filters (Escape closes) → listing → date pickers → book.
2. Map page: use the listing list under the map (not mouse-only markers).
3. Contrast: muted text should read clearly on near-black backgrounds.
4. Host edit: Accessibility amenity category + description field.
5. Admin → Adapted Accessibility for proof review (after proofs exist).

## Known follow-ups

- Per-image host alt editor UI (save currently writes fallback alts; AI via `POST /api/properties/[id]/image-alts`).
- Host proof upload UI (API: `POST /api/host/accessibility-proofs`).
- axe CI smoke in CI pipeline.
