-- Host verification documents (run in Supabase SQL Editor)
-- Storage: create a PRIVATE bucket id = host-verification-docs
-- The Next.js admin API issues short-lived signed URLs (see /api/admin/host-documents/signed-url).

CREATE TABLE IF NOT EXISTS host_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_verification_documents_user_id ON host_verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_host_verification_documents_status ON host_verification_documents(status);

ALTER TABLE host_verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification documents" ON host_verification_documents;
DROP POLICY IF EXISTS "Users can insert own verification documents" ON host_verification_documents;

CREATE POLICY "Users can view own verification documents"
  ON host_verification_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification documents"
  ON host_verification_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin updates are performed via service role in Next.js API routes.

GRANT ALL ON host_verification_documents TO authenticated;
GRANT ALL ON host_verification_documents TO service_role;

-- =============================================
-- Storage RLS (bucket: host-verification-docs)
-- =============================================
-- 1. Dashboard > Storage > New bucket: id = host-verification-docs, Public = OFF
-- 2. Run the block below in SQL Editor (or remove any old broad "Insert" policy first)
-- Object paths from the app: {auth.uid()}/{timestamp}-{filename}
-- Admin viewing uses service role signed URLs (no public SELECT needed for everyone)

DROP POLICY IF EXISTS "Host verification docs insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "Host verification docs delete own folder" ON storage.objects;
DROP POLICY IF EXISTS "Host verification docs select own folder" ON storage.objects;

-- Upload: only into folder named with the caller's user id
CREATE POLICY "Host verification docs insert own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'host-verification-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Delete: rollback upload if DB insert fails (see profile upload flow)
CREATE POLICY "Host verification docs delete own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'host-verification-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Read own files only (optional UI previews; not required for admin signed URLs)
CREATE POLICY "Host verification docs select own folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'host-verification-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
