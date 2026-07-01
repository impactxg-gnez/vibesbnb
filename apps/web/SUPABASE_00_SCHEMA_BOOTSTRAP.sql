-- =============================================================================
-- RUN THIS FIRST in Supabase SQL Editor (production / new projects)
-- Creates core tables if your project is missing bookings, reviews, profiles, etc.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS where needed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'traveller',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- properties (minimal — you may have a richer schema from other migrations)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT,
  title TEXT,
  location TEXT,
  price DECIMAL(10,2),
  rating DECIMAL(3,2),
  images TEXT[],
  type TEXT,
  amenities TEXT[],
  guests INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active properties" ON properties;
CREATE POLICY "Everyone can view active properties" ON properties
  FOR SELECT USING (status = 'active');

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id TEXT NOT NULL,
  property_name TEXT NOT NULL,
  property_image TEXT,
  location TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  kids INTEGER DEFAULT 0,
  pets INTEGER DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  rating DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
CREATE POLICY "Users can insert their own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
CREATE POLICY "Users can insert their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;
CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can view their own reviews" ON reviews;
CREATE POLICY "Users can view their own reviews" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_team_review IS NOT TRUE);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;
GRANT SELECT ON reviews TO anon;

-- One review per user per property (team reviews use null user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_property_unique
  ON reviews(property_id, user_id)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Schema bootstrap complete (bookings, reviews, profiles, properties, favorites).' AS status;
