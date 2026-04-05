-- =============================================
-- Payout Accounts Table for Host Bank Details
-- =============================================
-- Run this in Supabase SQL Editor to create the payout_accounts table
-- This table stores host banking information for payouts

-- Create the payout_accounts table
CREATE TABLE IF NOT EXISTS payout_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  routing_number_encrypted TEXT NOT NULL,
  account_type TEXT DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
  swift_code TEXT,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'suspended')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one payout account per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payout_accounts_user_id ON payout_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_status ON payout_accounts(status);

-- Enable Row Level Security
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own payout account
CREATE POLICY "Users can view own payout account"
  ON payout_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own payout account
CREATE POLICY "Users can insert own payout account"
  ON payout_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payout account
CREATE POLICY "Users can update own payout account"
  ON payout_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all payout accounts (for verification)
CREATE POLICY "Admins can view all payout accounts"
  ON payout_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Admins can update payout account status (for verification)
CREATE POLICY "Admins can update payout account status"
  ON payout_accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payout_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_payout_accounts_updated_at ON payout_accounts;
CREATE TRIGGER trigger_payout_accounts_updated_at
  BEFORE UPDATE ON payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_accounts_updated_at();

-- =============================================
-- IMPORTANT SECURITY NOTE:
-- =============================================
-- In a production environment, you should:
-- 1. Use proper encryption for sensitive fields (account_number, routing_number)
-- 2. Consider using a payment processor like Stripe Connect for handling payouts
-- 3. Implement additional verification steps before activating accounts
-- 4. Store audit logs for any changes to payout information
-- 5. Use PCI-DSS compliant storage if handling card data
-- =============================================

-- Grant necessary permissions
GRANT ALL ON payout_accounts TO authenticated;
GRANT SELECT ON payout_accounts TO service_role;

-- Verify the table was created
SELECT 'payout_accounts table created successfully!' AS status;
