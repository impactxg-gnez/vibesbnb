-- Optional: snapshot of dispensary wellness supplies included in the booking (for support / host visibility).
-- Run in Supabase SQL Editor before relying on API inserts for wellness_line_items.

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS wellness_line_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN bookings.wellness_line_items IS 'JSON array of { id, name, category, price, image? } from dispensary pre-order cart; totals included in total_price.';
