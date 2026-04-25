-- Optional: speeds up admin “Manage Listings” and any list ordered by recency
-- Run in Supabase SQL Editor if admin property list is slow at scale.

CREATE INDEX IF NOT EXISTS idx_properties_created_at_desc
  ON properties (created_at DESC NULLS LAST);
