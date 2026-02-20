-- Migration script to backfill candidate names in existing submissions
-- This script updates submissions that don't have candidate_name in resume_data
-- by fetching the name from user_profiles table

-- Update submissions where resume_data doesn't have candidate_name
-- and candidate_id exists in user_profiles
UPDATE submissions s
SET resume_data = COALESCE(
    jsonb_set(
        COALESCE(s.resume_data, '{}'::jsonb),
        '{candidate_name}',
        to_jsonb(up.full_name)
    ),
    jsonb_build_object('candidate_name', up.full_name)
)
FROM user_profiles up
WHERE s.candidate_id = up.id
  AND (
    s.resume_data IS NULL 
    OR s.resume_data->>'candidate_name' IS NULL
    OR s.resume_data->>'candidate_name' = ''
  )
  AND up.full_name IS NOT NULL
  AND up.full_name != '';

-- Also update candidate_email from auth.users if possible
-- Note: This requires a function with SECURITY DEFINER to access auth.users
-- For now, we'll just update the name from user_profiles

-- Verify the update
SELECT 
    s.id,
    s.candidate_id,
    s.resume_data->>'candidate_name' as candidate_name,
    up.full_name as profile_name
FROM submissions s
LEFT JOIN user_profiles up ON s.candidate_id = up.id
WHERE s.resume_data->>'candidate_name' IS NOT NULL
LIMIT 10;
