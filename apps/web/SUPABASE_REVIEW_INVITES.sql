-- =============================================
-- External guest review invite links
-- =============================================
-- One reusable active token per property. Admin copies /review/<token>.
-- Recipients sign in with Google and post a guest review (no VibesBnB stay required).
-- Service-role APIs only; no public SELECT.

CREATE TABLE IF NOT EXISTS review_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  property_id TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_invites_property_id ON review_invites(property_id);
CREATE INDEX IF NOT EXISTS idx_review_invites_token ON review_invites(token);

-- At most one live invite URL per listing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_invites_one_active_per_property
  ON review_invites(property_id)
  WHERE revoked_at IS NULL;

ALTER TABLE review_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE review_invites FROM PUBLIC;
REVOKE ALL ON TABLE review_invites FROM anon;
REVOKE ALL ON TABLE review_invites FROM authenticated;

SELECT 'review_invites table ready.' AS status;
