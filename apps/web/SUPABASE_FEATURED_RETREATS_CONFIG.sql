-- Homepage "Featured Vibes": manual property order + how many cards to show.
-- Run in Supabase SQL Editor. Accessed only via service role / server routes (RLS: no public policies).

CREATE TABLE IF NOT EXISTS featured_retreats_config (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  property_ids TEXT[] NOT NULL DEFAULT '{}',
  display_count INTEGER NOT NULL DEFAULT 6 CHECK (display_count >= 1 AND display_count <= 24),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO featured_retreats_config (id, property_ids, display_count)
VALUES ('default', '{}', 6)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE featured_retreats_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION featured_retreats_config_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_featured_retreats_config_updated ON featured_retreats_config;
CREATE TRIGGER trg_featured_retreats_config_updated
  BEFORE UPDATE ON featured_retreats_config
  FOR EACH ROW
  EXECUTE PROCEDURE featured_retreats_config_set_updated_at();
