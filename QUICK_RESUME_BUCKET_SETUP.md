# Quick Resume Bucket Setup

## 🚀 Quick Steps

### 1. Create Bucket (Dashboard)
- Go to **Supabase Dashboard** → **Storage**
- Click **"New bucket"**
- Name: `resumes`
- Make it **Public** ✅
- File size limit: `10 MB`
- Click **"Create bucket"**

### 2. Add Policies (SQL Editor)
Go to **SQL Editor** and run:

```sql
-- Allow users to upload/view their own resumes
-- File path format: resumes/{user-id}-{timestamp}.{ext}
-- Check if filename starts with user's ID
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

-- Allow recruiters to view all resumes
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

### 3. Test
- Upload a resume as a candidate
- View it as a recruiter
- ✅ Done!

---

**For detailed instructions, see `SUPABASE_RESUME_BUCKET_SETUP.md`**
