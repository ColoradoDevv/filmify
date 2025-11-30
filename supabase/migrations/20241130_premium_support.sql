-- Add premium subscription support to profiles table
-- This enables the ad monetization system to differentiate between free and premium users

-- Add is_premium column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Add premium subscription metadata columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS premium_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster premium status queries
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_premium_expires ON profiles(premium_expires_at);

-- Add comment to document the column
COMMENT ON COLUMN profiles.is_premium IS 'Indicates if user has an active premium subscription (no ads)';
COMMENT ON COLUMN profiles.premium_since IS 'Timestamp when user first became premium';
COMMENT ON COLUMN profiles.premium_expires_at IS 'Timestamp when premium subscription expires (NULL for lifetime)';

-- Optional: Create a function to check if premium is active
CREATE OR REPLACE FUNCTION is_premium_active(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_premium 
    FROM profiles 
    WHERE id = user_id
    AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_premium_active TO authenticated;
