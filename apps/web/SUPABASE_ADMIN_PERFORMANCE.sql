-- Admin UI performance: run in Supabase SQL Editor if admin pages still time out.
-- Safe to re-run (IF NOT EXISTS).

-- List ordering (Manage Listings)
CREATE INDEX IF NOT EXISTS idx_properties_created_at_desc
  ON properties (created_at DESC NULLS LAST);

-- Status filters (pending approval tab, badge counts)
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties (status);

-- Fast pending-approval badge count
CREATE INDEX IF NOT EXISTS idx_properties_pending_approval
  ON properties (id)
  WHERE status = 'pending_approval';

-- Host property counts (admin users page)
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties (host_id);

SELECT 'Admin performance indexes applied.' AS status;
