-- =============================================
-- Reviews Table Updates for Admin Management
-- =============================================
-- RUN ORDER:
--   1. SUPABASE_00_SCHEMA_BOOTSTRAP.sql  (if bookings/reviews missing)
--   2. SUPABASE_ADMIN_REALTIME_RLS.sql   (creates is_vibesbnb_admin_jwt)
--   3. This file

-- Ensure reviews table exists (minimal — bootstrap file has full schema)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_team_review BOOLEAN DEFAULT false,
  reviewer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Team review columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_team_review BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Requires public.is_vibesbnb_admin_jwt() from SUPABASE_ADMIN_REALTIME_RLS.sql
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NULL THEN
    RAISE EXCEPTION 'reviews table could not be created. Run SUPABASE_00_SCHEMA_BOOTSTRAP.sql first.';
  END IF;
END $$;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can insert team reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;

CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (public.is_vibesbnb_admin_jwt());

CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (public.is_vibesbnb_admin_jwt() AND is_team_review = true)
  );

CREATE POLICY "Admins can update all reviews" ON reviews
  FOR UPDATE USING (public.is_vibesbnb_admin_jwt());

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete reviews" ON reviews
  FOR DELETE USING (public.is_vibesbnb_admin_jwt());

GRANT ALL ON reviews TO authenticated;

SELECT 'Reviews table updated successfully!' AS status;
