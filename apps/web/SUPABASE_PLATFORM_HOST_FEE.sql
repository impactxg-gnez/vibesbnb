-- Host fee % (deducted from host payout) + host_fee column on payout ledger.
-- Run in Supabase SQL Editor after SUPABASE_PLATFORM_SETTINGS.sql.

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS host_fee_percent NUMERIC(6, 2) NOT NULL DEFAULT 5
    CHECK (host_fee_percent >= 0 AND host_fee_percent <= 100);

UPDATE platform_settings
SET host_fee_percent = 5
WHERE id = 'default' AND host_fee_percent IS NULL;

ALTER TABLE host_payouts
  ADD COLUMN IF NOT EXISTS host_fee NUMERIC(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN platform_settings.host_fee_percent IS
  'Percent of guest grand total deducted from host payout (platform keep).';

COMMENT ON COLUMN host_payouts.host_fee IS
  'Host-side platform fee deducted from lodging earnings for this booking.';

SELECT 'platform host fee ready' AS status;
