-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to properties table
-- 768 dimensions for Google's text-embedding-004
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create a function to search for properties by embedding similarity
CREATE OR REPLACE FUNCTION match_properties (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  min_guests int DEFAULT 1,
  location_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  location text,
  description text,
  price numeric,
  images text[],
  amenities text[],
  rating numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.location,
    p.description,
    p.price,
    p.images,
    p.amenities,
    p.rating,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM properties p
  WHERE 
    p.status = 'active'
    AND (p.guests >= min_guests OR p.guests IS NULL)
    AND (location_query IS NULL OR p.location ILIKE '%' || location_query || '%')
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
