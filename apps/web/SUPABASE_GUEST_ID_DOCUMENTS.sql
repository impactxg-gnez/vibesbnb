-- Guest government IDs at checkout (v2 amendment Section C).
-- 1. Dashboard > Storage > New bucket: id = guest-id-docs, Public = OFF
-- 2. Run this file in the SQL editor.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_id_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN bookings.guest_id_documents IS
  'Photo IDs for every guest on the stay (slot, storage_path, file_name). Check-in details require a complete set.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('guest-id-docs', 'guest-id-docs', false)
ON CONFLICT (id) DO NOTHING;
