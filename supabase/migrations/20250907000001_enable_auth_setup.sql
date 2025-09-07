-- Enable Supabase Auth and configure for existing users migration
-- This migration prepares the database for Supabase Auth integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create auth schema if it doesn't exist (Supabase manages this, but just in case)
-- Note: Supabase Auth creates its own auth.users table automatically

-- Create a function to sync existing users to auth.users
CREATE OR REPLACE FUNCTION sync_user_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be used later when we migrate users
  -- For now, it's just a placeholder
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a column to track auth migration status
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS migrated_to_auth BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_migrated ON public.users(migrated_to_auth);

-- Add comments for documentation
COMMENT ON COLUMN public.users.auth_user_id IS 'Reference to Supabase auth.users table';
COMMENT ON COLUMN public.users.migrated_to_auth IS 'Flag to track if user has been migrated to Supabase Auth';

-- Create a view for user data that combines both tables (for transition period)
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.username,
    u.branch,
    u.year,
    u.bio,
    u.avatar_url,
    u.reputation,
    u.is_verified,
    u.created_at,
    u.updated_at,
    u.auth_user_id,
    u.migrated_to_auth,
    CASE 
        WHEN u.migrated_to_auth THEN 'supabase_auth'
        ELSE 'custom_auth'
    END as auth_type
FROM public.users u;

COMMENT ON VIEW user_profiles IS 'Combined view of user data for auth migration period';
