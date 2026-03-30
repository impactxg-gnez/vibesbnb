-- Migration to add extra guest pricing to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS allow_extra_guests BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS extra_guest_price DECIMAL(10,2) DEFAULT 0;

-- Comment for table
COMMENT ON COLUMN properties.allow_extra_guests IS 'Whether the host allows more guests than the base capacity';
COMMENT ON COLUMN properties.extra_guest_price IS 'Price charged per extra guest per night';
