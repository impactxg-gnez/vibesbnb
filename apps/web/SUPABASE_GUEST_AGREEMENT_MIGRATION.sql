-- Guest rules & liability agreement (per property document + per-booking signature)
-- Run in Supabase SQL Editor after review.
--
-- Storage: create bucket `guest-agreements` (public read recommended so guests can open PDFs without signed URLs).
-- Policies (Storage): allow authenticated users to upload to folder `{property_id}/**` only when they own the property
-- (match host_id in properties table — often done via storage policy using (storage.foldername(name))[1] = property_id and RLS on properties).

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS guest_agreement_url TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_agreement_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guest_agreement_signer_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_agreement_document_url TEXT;

COMMENT ON COLUMN properties.guest_agreement_url IS 'Public URL to host-uploaded PDF (optional); shown to guests before booking.';
COMMENT ON COLUMN bookings.guest_agreement_accepted_at IS 'When the guest acknowledged the rules agreement.';
COMMENT ON COLUMN bookings.guest_agreement_signer_name IS 'Guest legal name as entered when accepting.';
COMMENT ON COLUMN bookings.guest_agreement_document_url IS 'Snapshot of host PDF URL at booking time (audit).';

-- Example storage policies (adjust bucket name if needed):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('guest-agreements', 'guest-agreements', true) ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "Public read guest agreements"
--   ON storage.objects FOR SELECT TO public
--   USING (bucket_id = 'guest-agreements');
--
-- CREATE POLICY "Hosts upload guest agreements"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'guest-agreements' AND auth.uid() IS NOT NULL);
--
-- CREATE POLICY "Hosts update own guest agreements"
--   ON storage.objects FOR UPDATE TO authenticated
--   USING (bucket_id = 'guest-agreements');
--
-- CREATE POLICY "Hosts delete own guest agreements"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'guest-agreements');
