-- Migration Script: Enhanced Bookings and Notifications System
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add host contact fields to user metadata (stored in auth.users)
-- Note: WhatsApp and email will be stored in user_metadata
-- At least one (WhatsApp OR email) must be provided by hosts

-- 2. Update bookings table to include host_id and enhanced status tracking
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS host_email TEXT,
  ADD COLUMN IF NOT EXISTS host_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS special_requests TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS host_approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS host_rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update status check constraint to include new statuses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending_approval', 'accepted', 'rejected', 'confirmed', 'pending', 'cancelled', 'completed'));

-- Set default status to 'pending_approval' for new bookings
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Create index for host_id
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- 3. Create notifications table for in-app messages
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'booking_request',
    'booking_accepted',
    'booking_rejected',
    'booking_confirmed',
    'booking_cancelled',
    'payment_required',
    'payment_received',
    'new_message'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 4. Enable Row Level Security (RLS) for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications for any user
-- (This will be handled via service role key in API routes)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Update bookings RLS policies to allow hosts to view their bookings
DROP POLICY IF EXISTS "Hosts can view their bookings" ON bookings;
CREATE POLICY "Hosts can view their bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update their bookings" ON bookings;
CREATE POLICY "Hosts can update their bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = host_id);

-- 6. Create function to send notifications (for use in triggers or API)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_booking_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_booking_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_booking_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to notify host when booking is created
CREATE OR REPLACE FUNCTION notify_host_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for host
  PERFORM create_notification(
    NEW.host_id,
    'booking_request',
    'New Booking Request',
    'You have a new booking request for ' || NEW.property_name || ' from ' || NEW.guest_name || '.',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_host_on_booking ON bookings;
CREATE TRIGGER trigger_notify_host_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'pending_approval')
  EXECUTE FUNCTION notify_host_on_booking();

-- 8. Create trigger to notify guest when booking is accepted
CREATE OR REPLACE FUNCTION notify_guest_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending_approval' THEN
    -- Create notification for guest
    PERFORM create_notification(
      NEW.user_id,
      'booking_accepted',
      'Booking Accepted!',
      'Your booking for ' || NEW.property_name || ' has been accepted. Please proceed with payment.',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_guest_on_acceptance ON bookings;
CREATE TRIGGER trigger_notify_guest_on_acceptance
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_guest_on_acceptance();

-- 9. Create trigger to notify guest when booking is rejected
CREATE OR REPLACE FUNCTION notify_guest_on_rejection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending_approval' THEN
    -- Create notification for guest
    PERFORM create_notification(
      NEW.user_id,
      'booking_rejected',
      'Booking Declined',
      'Your booking request for ' || NEW.property_name || ' has been declined by the host.',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_guest_on_rejection ON bookings;
CREATE TRIGGER trigger_notify_guest_on_rejection
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_guest_on_rejection();





