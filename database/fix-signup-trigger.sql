-- Fix signup trigger to handle user profile creation
-- Run this in your Supabase SQL Editor

-- First, ensure the function exists and is correct
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into user_profiles, handling potential conflicts
    INSERT INTO user_profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'role', ''),
            NULLIF(NEW.raw_user_meta_data->>'account_type', ''),
            'candidate'
        )
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        role = COALESCE(EXCLUDED.role, user_profiles.role),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Ensure RLS allows the trigger to insert
-- The SECURITY DEFINER should bypass RLS, but let's make sure
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow trigger to insert (SECURITY DEFINER should handle this, but just in case)
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON user_profiles;
-- Note: SECURITY DEFINER functions bypass RLS, so this shouldn't be needed
-- But we'll keep the existing policies for regular users
