-- Migration: Add has_resume and resume_uploaded_at columns to user_profiles
-- Run this in Supabase SQL Editor if the columns don't exist

-- Add has_resume column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'has_resume'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN has_resume BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add resume_uploaded_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'resume_uploaded_at'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN resume_uploaded_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing rows: if user has resume_data, set has_resume = true
UPDATE user_profiles up
SET has_resume = true,
    resume_uploaded_at = COALESCE(
        (SELECT updated_at FROM resume_data rd WHERE rd.user_id = up.id),
        NOW()
    )
WHERE EXISTS (
    SELECT 1 FROM resume_data rd WHERE rd.user_id = up.id
);

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name IN ('has_resume', 'resume_uploaded_at')
ORDER BY column_name;
