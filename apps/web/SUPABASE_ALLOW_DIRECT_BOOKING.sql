-- Host can allow guests to pay without prior message/approval (instant checkout path).
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS allow_direct_booking BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN properties.allow_direct_booking IS
  'When true, travellers may complete PayPal checkout immediately after submitting a request. When false, host must approve in messages first.';
