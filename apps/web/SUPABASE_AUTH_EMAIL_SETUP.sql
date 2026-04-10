-- ============================================================================
-- Auth email templates are NOT applied via SQL.
-- The file SUPABASE_AUTH_EMAIL_TEMPLATES.html is HTML for the Dashboard only.
-- Pasting that .html into this SQL editor will always fail (PostgreSQL is not
-- an HTML runner — you will see: syntax error at or near "<!").
--
-- What to do instead:
--   1. Open Supabase Dashboard → Authentication → Email Templates
--   2. Choose a template ("Confirm signup" or "Reset password")
--   3. Copy the matching <table> ... </table> block from SUPABASE_AUTH_EMAIL_TEMPLATES.html
--      (each template has its own block; skip <!-- comments --> if needed)
--   4. Paste into the template body and Save
-- ============================================================================

SELECT
  'Auth email HTML lives in apps/web/SUPABASE_AUTH_EMAIL_TEMPLATES.html — use the Dashboard, not SQL.'
    AS setup_note;
