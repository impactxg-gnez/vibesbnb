-- Refundable security deposit (per stay, shown at checkout; not included in grand total by default)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS refundable_deposit numeric(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN properties.refundable_deposit IS
  'Optional refundable deposit collected separately from the booking grand total.';
