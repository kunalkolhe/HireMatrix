# HireMatrix - AI-Powered Intelligent Assessment & Hiring Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange?style=for-the-badge&logo=openai)](https://openai.com/)

> **Eliminate fake applications and hire the right talent with AI-driven assessments**

HireMatrix is an intelligent assessment platform that automatically generates role-specific questions, evaluates candidates using AI, and provides comprehensive analytics to help recruiters make data-driven hiring decisions.

---

## 🎯 Overview

HireMatrix revolutionizes the hiring process by:

- **Parsing job descriptions** to extract skills, experience levels, and requirements
- **Generating custom assessments** with MCQs, subjective questions, and coding challenges
- **Evaluating candidates** using AI-powered scoring and plagiarism detection
- **Detecting fake applications** through resume-skill mismatch analysis and anti-cheat mechanisms
- **Providing detailed analytics** with skill gap analysis, benchmark comparisons, and downloadable reports

---

## ✨ Key Features

### 🤖 AI-Powered Intelligence
- **Job Description Parsing**: Automatically extracts skills, experience levels, tools, and domain knowledge
- **Question Generation**: Creates balanced assessments (MCQ, Subjective, Coding) based on JD requirements
- **Smart Evaluation**: AI-assisted scoring for subjective answers with rubric-based assessment
- **Plagiarism Detection**: Text and code similarity checks to identify copied content

### 🛡️ Anti-Fake Application System
- **Resume-Skill Mismatch Detection**: Identifies discrepancies between claimed and actual skills
- **Anti-Cheat Mechanisms**: Tab switch detection, copy-paste monitoring, time anomaly tracking
- **Bot Detection**: Identifies suspicious patterns, repeated applications, and automated submissions
- **Guess Pattern Detection**: Flags random or guess-based attempts

### 📊 Comprehensive Analytics
- **Detailed Candidate Reports**: Strengths, weaknesses, skill gap analysis
- **Benchmark Comparison**: Percentile ranking against other candidates
- **Leaderboards**: Real-time ranking with configurable filters
- **Export Options**: CSV and PDF report generation

### 👥 Role-Based Access
- **Recruiter Dashboard**: Create assessments, track applicants, manage candidates
- **Candidate Dashboard**: View available assessments, track progress, manage profile
- **Secure Authentication**: Supabase Auth with role-based access control

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Monaco Editor** - Code editor for coding questions
- **Recharts** - Data visualization

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL database with Row Level Security
- **OpenAI/OpenRouter** - AI model integration for JD parsing and question generation

### Key Libraries
- **@supabase/supabase-js** - Database client
- **openai** - AI model interactions
- **sonner** - Toast notifications
- **zod** - Schema validation

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm/yarn/pnpm
- **Supabase Account** - [Create one here](https://supabase.com)
- **OpenRouter API Key** - [Get one here](https://openrouter.ai) (or OpenAI API key)
- **Git** - For version control

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SkillZen-main
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
# OR use OpenAI directly
OPENAI_API_KEY=your_openai_api_key

# Optional: Resume Parsing (if using ApyHub)
APYHUB_API_KEY=your_apyhub_api_key
```

### 4. Database Setup

1. **Create a Supabase Project** at [supabase.com](https://supabase.com)

2. **Run the Database Schema**:
   - Open Supabase SQL Editor
   - Copy and paste the contents of `database-schema.sql`
   - Execute the script

   This will create:
   - Tables: `jobs`, `assessments`, `questions`, `submissions`, `answers`, `scores`, `user_profiles`
   - Row Level Security (RLS) policies
   - Indexes for performance
   - Triggers for automatic profile creation

3. **Set Up Storage Buckets**:
   
   **For Profile Photos (`avatars` bucket):**
   - Go to Supabase Dashboard → Storage
   - Click "Create a new bucket"
   - Name: `avatars`
   - Make it **Public**
   - Click "Create bucket"
   - Add policies (or use SQL Editor):
     ```sql
     -- Allow authenticated users to upload their own avatars
     CREATE POLICY "Users can upload own avatar"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'avatars' AND
       auth.uid()::text = (storage.foldername(name))[1]
     );
     
     -- Allow public read access
     CREATE POLICY "Public avatar access"
     ON storage.objects FOR SELECT
     USING (bucket_id = 'avatars');
     ```
   
   **For Resumes (`resumes` bucket - Optional):**
   - Create another bucket named `resumes`
   - Make it **Public** (or Private with proper policies)
   - Add policies:
     ```sql
     -- Allow authenticated users to upload their own resumes
     CREATE POLICY "Users can upload own resume"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'resumes' AND
       auth.uid()::text = (storage.foldername(name))[1]
     );
     
     -- Allow recruiters to view resumes
     CREATE POLICY "Recruiters can view resumes"
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
   
   **Note:** Resume file storage is optional. The parsed resume data is stored in the database, so the file storage is only for reference.

4. **Verify Setup**:
   - Check that all tables are created
   - Verify RLS policies are enabled
   - Test user creation to ensure trigger works

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── parse-jd/            # Job description parsing
│   │   ├── generate-assessment/  # Question generation
│   │   ├── evaluate/            # AI evaluation
│   │   └── resume-parser-v2/    # Resume parsing
│   ├── recruiter/               # Recruiter pages
│   │   ├── dashboard/           # Main dashboard
│   │   ├── jobs/                # Job management
│   │   ├── candidates/          # Candidate management
│   │   └── analytics/           # Analytics dashboard
│   ├── candidate/               # Candidate pages
│   │   ├── dashboard/           # Available assessments
│   │   └── profile/             # Profile management
│   └── test/                    # Assessment taking flow
│       └── [id]/                # Dynamic assessment routes
├── components/                   # Reusable UI components
├── lib/                          # Core services
│   ├── jobService.ts            # Job/assessment management
│   ├── submissionService.ts     # Submission handling
│   ├── evaluationService.ts     # Scoring logic
│   ├── plagiarismDetection.ts  # Plagiarism checks
│   ├── botDetection.ts          # Bot detection
│   └── benchmarkService.ts      # Benchmark comparison
├── contexts/                     # React contexts
├── database-schema.sql          # Database schema
└── README.md                     # This file
```

---

## 🔑 Key Features Explained

### 1. Job Description Intelligence

Upload a job description, and HireMatrix will:
- Extract technical skills, soft skills, tools, and domain knowledge
- Determine experience level (fresher/junior/mid/senior)
- Map requirements to assessment criteria
- Suggest question topics and difficulty levels

**API**: `POST /api/parse-jd`

### 2. Automated Question Generation

Based on the parsed JD, the system generates:
- **MCQ Questions**: Multiple choice questions with 4 options
- **Subjective Questions**: Scenario-based questions requiring detailed answers
- **Coding Challenges**: Programming problems with test cases

**API**: `POST /api/generate-assessment`

### 3. Smart Candidate Evaluation

- **MCQ**: Automatic exact-match scoring
- **Subjective**: AI-assisted rubric-based evaluation (with heuristic fallback)
- **Coding**: Test case execution and scoring
- **Plagiarism**: Text and code similarity detection
- **Anti-Cheat**: Tab switches, copy-paste, time anomalies

### 4. Anti-Fake Application Detection

- **Resume-Skill Mismatch**: Compares claimed skills with assessment performance
- **Bot Detection**: Identifies automated submissions and suspicious patterns
- **Plagiarism**: Detects copied answers and code
- **Anomaly Detection**: Flags unusual timing patterns

### 5. Analytics & Reporting

- **Candidate Reports**: Detailed performance breakdown
- **Skill Analysis**: Strengths, weaknesses, skill gaps
- **Benchmark Comparison**: Percentile ranking
- **Leaderboards**: Real-time candidate rankings
- **Export**: CSV and PDF reports

---

## 🔐 Authentication & Authorization

### User Roles

- **Candidate**: Can take assessments, view own results
- **Recruiter**: Can create assessments, view all candidates, manage jobs
- **Admin**: Full system access (future)

### Row Level Security (RLS)

All database tables have RLS policies:
- Candidates can only view/edit their own submissions
- Recruiters can manage assessments for their jobs
- Public read access for active assessments

---

## 📡 API Endpoints

### Job Description Parsing
```
POST /api/parse-jd
Body: { jobDescription: string }
Returns: Parsed JD with skills, experience level, recommendations
```

### Question Generation
```
POST /api/generate-assessment
Body: { parsedJD, config }
Returns: Generated questions (MCQ, Subjective, Coding)
```

### Evaluation
```
POST /api/evaluate
Body: { submission, questions }
Returns: Evaluation results with scores and feedback
```

### Resume Parsing
```
POST /api/resume-parser-v2
Body: { file: File }
Returns: Parsed resume data with skills extraction
```

---

## 🗄️ Database Schema

The database consists of:

- **jobs**: Job postings with parsed skills
- **assessments**: Assessment configurations
- **questions**: Individual questions linked to assessments
- **submissions**: Candidate submissions
- **answers**: Individual question answers
- **scores**: Evaluation scores and rankings
- **user_profiles**: Extended user information

See `database-schema.sql` for complete schema definition.

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`

---

## 🧪 Testing

### Manual Testing Flow

1. **As Recruiter**:
   - Sign up/login
   - Create a new assessment
   - Upload job description
   - Generate questions
   - Publish assessment
   - View candidates and analytics

2. **As Candidate**:
   - Browse available assessments
   - Take an assessment
   - View results and feedback

---

## 📝 Development Notes

### Data Storage

- **Production**: Supabase PostgreSQL database
- **Fallback**: localStorage (for demo/development)
- The system automatically falls back to localStorage if Supabase is unavailable

### Question Quality

Questions are generated using AI with:
- Role-specific difficulty levels
- Skill-based topic selection
- Balanced question distribution
- Configurable weightage

### Evaluation Logic

- **MCQ**: Exact match with correct answer
- **Subjective**: AI evaluation with rubric (fallback to length-based heuristic)
- **Coding**: Test case execution results
- **Plagiarism**: Similarity threshold (70% for text, 80% for code)

---

## 🤝 Contributing

This is a hackathon project. For improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

This project is created for hackathon purposes.

---

## 🎓 Hackathon Requirements Status

✅ **All Core Requirements Implemented**:
- ✅ Job Description Intelligence
- ✅ Automated Question Generation
- ✅ Smart Candidate Evaluation
- ✅ Anti-Fake Application Mechanism
- ✅ Scoring, Ranking & Leaderboards
- ✅ Detailed Candidate Analytics
- ✅ Recruiter & Admin Controls
- ✅ Fairness, Transparency & Explainability
- ✅ Scalability & Security (Supabase integration)

See `HACKATHON_REQUIREMENTS_CHECKLIST.md` for detailed status.

---

## 🆘 Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys in `.env.local`
- Check RLS policies are correctly set
- Ensure database schema is fully executed

### API Key Issues
- Verify OpenRouter/OpenAI API key is valid
- Check API quota/limits
- Ensure environment variables are loaded

### Assessment Not Loading
- Check browser console for errors
- Verify job/assessment exists in database
- Check localStorage fallback is working

---

## 📞 Support

For issues or questions:
- Check the console for error messages
- Review `database-schema.sql` for RLS policy issues
- Verify all environment variables are set correctly

---

## 🎉 Acknowledgments

Built with:
- Next.js for the framework
- Supabase for the database
- OpenAI/OpenRouter for AI capabilities
- Radix UI for accessible components

---

**Made with ❤️ for intelligent hiring**
