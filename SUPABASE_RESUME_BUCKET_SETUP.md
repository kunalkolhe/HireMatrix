# Supabase Resume Bucket Setup Guide

This guide will help you create and configure the `resumes` storage bucket in Supabase for storing candidate resume files.

## Prerequisites

- Access to your Supabase project dashboard
- Admin access to configure storage buckets and policies

---

## Step-by-Step Instructions

### Method 1: Using Supabase Dashboard (Recommended)

#### Step 1: Navigate to Storage

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **"Storage"** in the left sidebar
4. You should see a list of existing buckets (if any)

#### Step 2: Create the Resumes Bucket

1. Click the **"New bucket"** button (or "Create a new bucket")
2. Fill in the bucket details:
   - **Name**: `resumes` (must be exactly this name - lowercase, no spaces)
   - **Public bucket**: 
     - **Option A (Recommended)**: Make it **Public** ✅
       - This allows direct access to resume files via public URLs
       - Easier for recruiters to view resumes
     - **Option B**: Keep it **Private** 
       - More secure, but requires signed URLs for access
       - Better for sensitive data
   - **File size limit**: Set to `10 MB` (or your preferred limit)
   - **Allowed MIME types**: Leave empty (allows all types) OR specify:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `text/plain`
3. Click **"Create bucket"**

#### Step 3: Configure Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies to control who can upload and access resumes.

**Option A: Using SQL Editor (Recommended)**

1. Go to **SQL Editor** in the Supabase Dashboard
2. Click **"New query"**
3. Copy and paste the following SQL policies:

```sql
-- ============================================
-- RESUME STORAGE POLICIES
-- ============================================

-- Policy 1: Allow authenticated users to upload their own resumes
-- File path format: resumes/{user-id}-{timestamp}.{ext}
-- Check if filename (part after 'resumes/') starts with user's ID
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
```

4. Click **"Run"** to execute the SQL

**Option B: Using Policy Editor (Alternative)**

1. Go back to **Storage** → Click on the `resumes` bucket
2. Click on **"Policies"** tab
3. Click **"New Policy"** for each policy below:

   **Policy 1: Upload Own Resume**
   - Policy name: `Users can upload own resume`
   - Allowed operation: `INSERT`
   - Policy definition:
     ```sql
     bucket_id = 'resumes' AND
     auth.uid()::text = (string_to_array(name, '/'))[1]
     ```

   **Policy 2: View Own Resume**
   - Policy name: `Users can view own resume`
   - Allowed operation: `SELECT`
   - Policy definition:
     ```sql
     bucket_id = 'resumes' AND
     auth.uid()::text = (string_to_array(name, '/'))[1]
     ```

   **Policy 3: Recruiters View All**
   - Policy name: `Recruiters can view all resumes`
   - Allowed operation: `SELECT`
   - Policy definition:
     ```sql
     bucket_id = 'resumes' AND
     EXISTS (
       SELECT 1 FROM user_profiles
       WHERE user_profiles.id = auth.uid()
       AND user_profiles.role IN ('recruiter', 'admin')
     )
     ```

#### Step 4: Verify the Setup

1. **Test Upload** (as a candidate):
   - Log in as a candidate user
   - Go to the Resume Upload page (`/candidate/resume`)
   - Try uploading a resume file
   - Check if the upload succeeds

2. **Test Access** (as a recruiter):
   - Log in as a recruiter
   - View a candidate's profile/submission
   - Verify you can access their resume URL

3. **Check Storage**:
   - Go to Storage → `resumes` bucket
   - You should see uploaded files in the format: `resumes/{user-id}-{timestamp}.pdf`

---

## Alternative: Private Bucket Setup

If you prefer a **private bucket** for better security:

### Step 1: Create Private Bucket

1. Create the bucket as **Private** (uncheck "Public bucket")
2. Use the same policies as above

### Step 2: Generate Signed URLs

When accessing resumes, you'll need to generate signed URLs:

```typescript
// Example: Generate signed URL for resume access
const { data, error } = await supabase.storage
  .from('resumes')
  .createSignedUrl(filePath, 3600) // URL valid for 1 hour
```

**Note**: The current implementation uses public URLs. If you switch to private, you'll need to update:
- `app/candidate/resume/page.tsx` (line 137-140)
- Any other places that access resume URLs

---

## Troubleshooting

### Issue: "Bucket not found" error

**Solution**: 
- Verify the bucket name is exactly `resumes` (lowercase, no spaces)
- Check that the bucket was created successfully in Storage dashboard

### Issue: "Permission denied" when uploading

**Solution**:
- Verify RLS policies are created and enabled
- Check that the user is authenticated (`auth.uid()` should not be null)
- Ensure the file path format matches: `resumes/{user-id}-{timestamp}.{ext}`

### Issue: Recruiters can't view resumes

**Solution**:
- Verify the "Recruiters can view all resumes" policy exists
- Check that the recruiter's `user_profiles.role` is set to `'recruiter'` or `'admin'`
- Ensure RLS is enabled on the `user_profiles` table

### Issue: "Storage bucket might not exist" warning

**Solution**:
- This warning appears in the code if upload fails
- Check the browser console for detailed error messages
- Verify bucket creation and policies as described above

---

## File Path Structure

The application stores resumes with the following path structure:
```
resumes/
  ├── {user-id}-{timestamp}.pdf
  ├── {user-id}-{timestamp}.docx
  └── {user-id}-{timestamp}.doc
```

Example:
```
resumes/
  ├── 123e4567-e89b-12d3-a456-426614174000-1699123456789.pdf
  └── 987f6543-e21b-12d3-a456-426614174000-1699123456790.docx
```

---

## Security Considerations

1. **File Size Limits**: Set appropriate limits (recommended: 10MB) to prevent abuse
2. **MIME Type Restrictions**: Consider restricting to PDF, DOC, DOCX only
3. **Access Control**: Ensure policies properly restrict access based on user roles
4. **Regular Cleanup**: Consider implementing cleanup for old/unused resume files

---

## Quick Setup Script

If you prefer to set everything up at once, run this in the SQL Editor:

```sql
-- Create resumes bucket (if it doesn't exist)
-- Note: Bucket creation must be done via Dashboard or API
-- This script only creates the policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters can view all resumes" ON storage.objects;

-- Create policies
-- File path format: resumes/{user-id}-{timestamp}.{ext}
-- Check if filename (part after 'resumes/') starts with user's ID
CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%')
);

CREATE POLICY "Users can view own resume"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  (
    (auth.uid() IS NOT NULL AND (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%'))
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('recruiter', 'admin')
    )
  )
);

CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes' AND
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%')
);

CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' AND
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[2] LIKE (auth.uid()::text || '-%')
);

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
```

---

## Summary

✅ **Bucket Name**: `resumes`  
✅ **Visibility**: Public (recommended) or Private  
✅ **File Size Limit**: 10 MB (recommended)  
✅ **Policies**: 5 policies for upload, view, update, delete, and recruiter access  
✅ **File Path Format**: `resumes/{user-id}-{timestamp}.{ext}`

After completing these steps, your resume upload functionality should work correctly!
