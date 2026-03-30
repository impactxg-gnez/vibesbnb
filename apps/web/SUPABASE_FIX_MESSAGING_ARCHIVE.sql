-- Fix for 'column conversations.host_unread_count does not exist' and setup archiving
-- Run this in your Supabase SQL Editor

-- 1. Ensure unread count columns exist (fix for the error)
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS host_unread_count INTEGER DEFAULT 0;

ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS traveller_unread_count INTEGER DEFAULT 0;

-- 2. Create archive table for old messages
CREATE TABLE IF NOT EXISTS archived_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  contains_contact_info BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS archived_messages_conversation_idx ON archived_messages(conversation_id);

-- 3. Create a function to perform the archiving
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Insert old messages into archive
  INSERT INTO archived_messages (id, conversation_id, sender_id, body, contains_contact_info, created_at)
  SELECT id, conversation_id, sender_id, body, contains_contact_info, created_at
  FROM messages
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Delete from active messages
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- 4. (Optional) Setup a cron job if you have pg_cron enabled
-- SELECT cron.schedule('0 0 * * *', 'SELECT archive_old_messages()');
