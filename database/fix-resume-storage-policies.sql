-- ============================================
-- FIXED RESUME STORAGE POLICIES
-- ============================================
-- This fixes the RLS policy violation error (403 Unauthorized)
-- The issue was that the policy was checking the wrong part of the file path

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters can view all resumes" ON storage.objects;

-- Policy 1: Allow authenticated users to upload their own resumes
-- File path format: resumes/{user-id}-{timestamp}.{ext}
-- We check if the filename (part after 'resumes/') starts with the user's ID
CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%')
);

-- Policy 2: Allow users to view their own resumes
CREATE POLICY "Users can view own resume"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  (
    -- User can view their own resume (filename starts with their user ID)
    (auth.uid() IS NOT NULL AND (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%'))
    OR
    -- Or they are a recruiter/admin (handled by separate policy)
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('recruiter', 'admin')
    )
  )
);

-- Policy 3: Allow users to update their own resumes
CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes' AND
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%')
);

-- Policy 4: Allow users to delete their own resumes
CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' AND
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%')
);

-- Policy 5: Allow recruiters and admins to view all resumes
CREATE POLICY "Recruiters can view all resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('recruiter', 'admin')
  )
);
