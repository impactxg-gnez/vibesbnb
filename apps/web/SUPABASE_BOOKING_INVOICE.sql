-- Track when confirmation / invoice emails were sent (avoid duplicate sends from PayPal webhook + capture)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMPTZ;
