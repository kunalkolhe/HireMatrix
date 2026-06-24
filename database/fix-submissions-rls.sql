-- Add missing RLS policies for submissions to allow recruiters to update status

-- Submissions: Recruiters can update submissions for their jobs
DROP POLICY IF EXISTS "Recruiters can update submissions for their jobs" ON submissions;
CREATE POLICY "Recruiters can update submissions for their jobs" ON submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = submissions.job_id AND jobs.recruiter_id = auth.uid())
    );
