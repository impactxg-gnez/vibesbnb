-- One-time cleaning fee per stay (USD). Run in Supabase SQL Editor.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN properties.cleaning_fee IS 'Flat cleaning fee charged once per booking (not per night).';
