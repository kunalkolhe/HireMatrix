-- HireMatrix Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    parsed_skills JSONB DEFAULT '{"technical": [], "soft": [], "tools": [], "domain_knowledge": []}',
    experience_level VARCHAR(20) DEFAULT 'fresher' CHECK (experience_level IN ('fresher', 'junior', 'mid', 'senior')),
    responsibilities TEXT[] DEFAULT '{}',
    recruiter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ASSESSMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    total_marks INTEGER DEFAULT 100,
    passing_percentage INTEGER DEFAULT 50,
    config JSONB DEFAULT '{
        "mcq_count": 10,
        "mcq_weightage": 30,
        "subjective_count": 3,
        "subjective_weightage": 30,
        "coding_count": 2,
        "coding_weightage": 40,
        "shuffle_questions": true,
        "show_results_immediately": false,
        "allow_retake": false
    }',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mcq', 'subjective', 'coding')),
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    skill_tags TEXT[] DEFAULT '{}',
    marks INTEGER DEFAULT 10,
    content JSONB NOT NULL,
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    resume_url TEXT,
    resume_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'evaluated', 'shortlisted', 'rejected')),
    anti_cheat_flags JSONB DEFAULT '{"tab_switches": 0, "copy_paste_detected": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, assessment_id)
);

-- ============================================
-- ANSWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL,
    response JSONB NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, question_id)
);

-- ============================================
-- SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
    total_score DECIMAL(10, 2) DEFAULT 0,
    total_possible DECIMAL(10, 2) DEFAULT 0,
    percentage DECIMAL(5, 2) DEFAULT 0,
    section_scores JSONB DEFAULT '{}',
    skill_scores JSONB DEFAULT '{}',
    rank INTEGER,
    evaluation_feedback JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'candidate' CHECK (role IN ('candidate', 'recruiter', 'admin')),
    company VARCHAR(255),
    avatar_url TEXT,
    has_resume BOOLEAN DEFAULT false,
    resume_uploaded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RESUME DATA TABLE (stores parsed resume information)
-- ============================================
CREATE TABLE IF NOT EXISTS resume_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    resume_url TEXT,
    ats_score DECIMAL(5, 2),
    skills TEXT[] DEFAULT '{}',
    analysis JSONB DEFAULT '{}',
    personal_info JSONB DEFAULT '{}',
    experience JSONB DEFAULT '[]',
    education JSONB DEFAULT '[]',
    summary TEXT,
    achievements TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    projects TEXT[] DEFAULT '{}',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_assessments_job ON assessments(job_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_candidate ON submissions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment ON submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_scores_submission ON scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_resume_data_user ON resume_data(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_data ENABLE ROW LEVEL SECURITY;

-- Jobs: Recruiters can manage their own jobs, candidates can view active jobs
DROP POLICY IF EXISTS "Recruiters can manage own jobs" ON jobs;
CREATE POLICY "Recruiters can manage own jobs" ON jobs
    FOR ALL USING (auth.uid() = recruiter_id);
    
DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
CREATE POLICY "Anyone can view active jobs" ON jobs
    FOR SELECT USING (is_active = true);

-- Assessments: Linked to job visibility
DROP POLICY IF EXISTS "View assessments for accessible jobs" ON assessments;
CREATE POLICY "View assessments for accessible jobs" ON assessments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = assessments.job_id AND (jobs.is_active = true OR jobs.recruiter_id = auth.uid()))
    );

-- Assessments: Recruiters can manage assessments for their own jobs
DROP POLICY IF EXISTS "Recruiters can insert assessments for own jobs" ON assessments;
CREATE POLICY "Recruiters can insert assessments for own jobs" ON assessments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = assessments.job_id AND jobs.recruiter_id = auth.uid())
    );

DROP POLICY IF EXISTS "Recruiters can update assessments for own jobs" ON assessments;
CREATE POLICY "Recruiters can update assessments for own jobs" ON assessments
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = assessments.job_id AND jobs.recruiter_id = auth.uid())
    );

DROP POLICY IF EXISTS "Recruiters can delete assessments for own jobs" ON assessments;
CREATE POLICY "Recruiters can delete assessments for own jobs" ON assessments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = assessments.job_id AND jobs.recruiter_id = auth.uid())
    );

-- Questions: Recruiters can manage questions for their assessments
DROP POLICY IF EXISTS "Recruiters can insert questions for own assessments" ON questions;
CREATE POLICY "Recruiters can insert questions for own assessments" ON questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessments 
            JOIN jobs ON assessments.job_id = jobs.id 
            WHERE assessments.id = questions.assessment_id 
            AND jobs.recruiter_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Recruiters can update questions for own assessments" ON questions;
CREATE POLICY "Recruiters can update questions for own assessments" ON questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessments 
            JOIN jobs ON assessments.job_id = jobs.id 
            WHERE assessments.id = questions.assessment_id 
            AND jobs.recruiter_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Recruiters can delete questions for own assessments" ON questions;
CREATE POLICY "Recruiters can delete questions for own assessments" ON questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM assessments 
            JOIN jobs ON assessments.job_id = jobs.id 
            WHERE assessments.id = questions.assessment_id 
            AND jobs.recruiter_id = auth.uid()
        )
    );

-- Questions: Anyone can view questions for active assessments
DROP POLICY IF EXISTS "Anyone can view questions for active assessments" ON questions;
CREATE POLICY "Anyone can view questions for active assessments" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments 
            JOIN jobs ON assessments.job_id = jobs.id 
            WHERE assessments.id = questions.assessment_id 
            AND jobs.is_active = true
        )
    );

-- Submissions: Candidates see own, recruiters see for their jobs
DROP POLICY IF EXISTS "Candidates view own submissions" ON submissions;
CREATE POLICY "Candidates view own submissions" ON submissions
    FOR SELECT USING (candidate_id = auth.uid());
    
DROP POLICY IF EXISTS "Recruiters view submissions for their jobs" ON submissions;
CREATE POLICY "Recruiters view submissions for their jobs" ON submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = submissions.job_id AND jobs.recruiter_id = auth.uid())
    );

DROP POLICY IF EXISTS "Candidates can insert own submissions" ON submissions;
CREATE POLICY "Candidates can insert own submissions" ON submissions
    FOR INSERT WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can update own submissions" ON submissions;
CREATE POLICY "Candidates can update own submissions" ON submissions
    FOR UPDATE USING (candidate_id = auth.uid());

-- Answers: Candidates can insert/update their own answers
DROP POLICY IF EXISTS "Candidates can manage own answers" ON answers;
CREATE POLICY "Candidates can manage own answers" ON answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = answers.submission_id 
            AND submissions.candidate_id = auth.uid()
        )
    );

-- Answers: Recruiters can view answers for their job submissions
DROP POLICY IF EXISTS "Recruiters can view answers for their jobs" ON answers;
CREATE POLICY "Recruiters can view answers for their jobs" ON answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM submissions 
            JOIN jobs ON submissions.job_id = jobs.id 
            WHERE submissions.id = answers.submission_id 
            AND jobs.recruiter_id = auth.uid()
        )
    );

-- Scores: Recruiters can manage scores for their job submissions
DROP POLICY IF EXISTS "Recruiters can manage scores for their jobs" ON scores;
CREATE POLICY "Recruiters can manage scores for their jobs" ON scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM submissions 
            JOIN jobs ON submissions.job_id = jobs.id 
            WHERE submissions.id = scores.submission_id 
            AND jobs.recruiter_id = auth.uid()
        )
    );

-- Scores: Candidates can view their own scores
DROP POLICY IF EXISTS "Candidates can view own scores" ON scores;
CREATE POLICY "Candidates can view own scores" ON scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = scores.submission_id 
            AND submissions.candidate_id = auth.uid()
        )
    );

-- Scores: Candidates can insert/update their own scores (for auto-evaluation)
DROP POLICY IF EXISTS "Candidates can manage own scores" ON scores;
CREATE POLICY "Candidates can manage own scores" ON scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = scores.submission_id 
            AND submissions.candidate_id = auth.uid()
        )
    );

-- User profiles: Users can manage their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());
    
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Resume Data: Users can manage their own resume data
DROP POLICY IF EXISTS "Users can view own resume" ON resume_data;
CREATE POLICY "Users can view own resume" ON resume_data
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own resume" ON resume_data;
CREATE POLICY "Users can update own resume" ON resume_data
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own resume" ON resume_data;
CREATE POLICY "Users can insert own resume" ON resume_data
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Recruiters can view candidate resumes" ON resume_data;
CREATE POLICY "Recruiters can view candidate resumes" ON resume_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('recruiter', 'admin')
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update ranks after evaluation
CREATE OR REPLACE FUNCTION update_ranks(p_assessment_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ranked AS (
        SELECT 
            s.id as submission_id,
            ROW_NUMBER() OVER (ORDER BY sc.percentage DESC, s.submitted_at ASC) as new_rank
        FROM submissions s
        JOIN scores sc ON s.id = sc.submission_id
        WHERE s.assessment_id = p_assessment_id
        AND s.status IN ('evaluated', 'shortlisted')
    )
    UPDATE scores
    SET rank = ranked.new_rank
    FROM ranked
    WHERE scores.submission_id = ranked.submission_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(p_job_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    rank INTEGER,
    candidate_id UUID,
    candidate_name TEXT,
    total_score DECIMAL,
    percentage DECIMAL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.rank,
        s.candidate_id,
        COALESCE(up.full_name, 'Anonymous') as candidate_name,
        sc.total_score,
        sc.percentage,
        s.submitted_at,
        s.status
    FROM submissions s
    JOIN scores sc ON s.id = sc.submission_id
    LEFT JOIN user_profiles up ON s.candidate_id = up.id
    WHERE s.job_id = p_job_id
    AND s.status IN ('evaluated', 'shortlisted', 'rejected')
    ORDER BY sc.rank ASC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'candidate')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
