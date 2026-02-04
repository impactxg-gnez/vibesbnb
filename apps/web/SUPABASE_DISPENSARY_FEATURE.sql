-- Supabase Database Tables for Dispensary Feature
-- Run this in Supabase Dashboard > SQL Editor

-- Create dispensaries table
CREATE TABLE IF NOT EXISTS dispensaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_radius DECIMAL(10, 2) DEFAULT 10.0, -- in miles
  images TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster geosearch (standard B-Tree for now, can be PostGIS later)
CREATE INDEX IF NOT EXISTS idx_dispensaries_status ON dispensaries(status);
CREATE INDEX IF NOT EXISTS idx_dispensaries_user_id ON dispensaries(user_id);

-- Create dispensary_inventory table
CREATE TABLE IF NOT EXISTS dispensary_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispensary_id UUID REFERENCES dispensaries(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'out_of_stock', 'discontinued')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_dispensary_id ON dispensary_inventory(dispensary_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON dispensary_inventory(category);

-- Create dispensary_requests table
CREATE TABLE IF NOT EXISTS dispensary_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id TEXT,
  property_name TEXT,
  location TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dispensaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispensary_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispensary_requests ENABLE ROW LEVEL SECURITY;

-- Dispensaries Policies
CREATE POLICY "Everyone can view active dispensaries"
  ON dispensaries FOR SELECT
  USING (status = 'active');

CREATE POLICY "Owners can manage their own dispensaries"
  ON dispensaries FOR ALL
  USING (auth.uid() = user_id);

-- Inventory Policies
CREATE POLICY "Everyone can view inventory of active dispensaries"
  ON dispensary_inventory FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dispensaries WHERE dispensaries.id = dispensary_inventory.dispensary_id AND status = 'active'
  ));

CREATE POLICY "Owners can manage their own inventory"
  ON dispensary_inventory FOR ALL
  USING (EXISTS (
    SELECT 1 FROM dispensaries WHERE dispensaries.id = dispensary_inventory.dispensary_id AND auth.uid() = dispensaries.user_id
  ));

-- Requests Policies
CREATE POLICY "Users can create requests"
  ON dispensary_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view requests"
  ON dispensary_requests FOR SELECT
  USING (true); -- Simplified for now, should be admin-only in production
