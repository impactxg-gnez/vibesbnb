-- Speed up admin filters on property status (pending approval, etc.)
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties (status);
