-- Admin notification email dedupe (same claim pattern as invoice_sent_at)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS admin_new_booking_emailed_at TIMESTAMPTZ;

COMMENT ON COLUMN bookings.admin_new_booking_emailed_at IS
  'Set when admin_new_booking email has been dispatched (idempotent claim).';

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS admin_new_chat_emailed_at TIMESTAMPTZ;

COMMENT ON COLUMN conversations.admin_new_chat_emailed_at IS
  'Set when admin_new_chat email has been dispatched (idempotent claim).';

-- Managed list of emails that receive admin_new_booking / admin_new_chat
CREATE TABLE IF NOT EXISTS admin_notification_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_notification_emails_email_uidx
  ON admin_notification_emails (lower(email));

CREATE INDEX IF NOT EXISTS admin_notification_emails_enabled_idx
  ON admin_notification_emails (enabled)
  WHERE enabled = true;

COMMENT ON TABLE admin_notification_emails IS
  'Emails that receive admin transactional alerts (new booking, new chat). Managed in Admin panel.';

ALTER TABLE admin_notification_emails ENABLE ROW LEVEL SECURITY;
