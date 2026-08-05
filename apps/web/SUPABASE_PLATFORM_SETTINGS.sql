-- Platform-wide settings (service fee %, etc.). Run in Supabase SQL Editor (prod: okmudgacbpgycixtpoqx).

CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  service_fee_percent NUMERIC(6, 2) NOT NULL DEFAULT 10
    CHECK (service_fee_percent >= 0 AND service_fee_percent <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id, service_fee_percent)
VALUES ('default', 10)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- No public policies — service role / server routes only.

CREATE OR REPLACE FUNCTION platform_settings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_settings_updated ON platform_settings;
CREATE TRIGGER trg_platform_settings_updated
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE PROCEDURE platform_settings_set_updated_at();

SELECT 'platform_settings ready' AS status;
