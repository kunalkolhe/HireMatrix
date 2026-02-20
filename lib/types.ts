// HireMatrix - Core Type Definitions

export type UserRole = 'candidate' | 'recruiter' | 'admin'
export type ExperienceLevel = 'fresher' | 'junior' | 'mid' | 'senior'
export type QuestionType = 'mcq' | 'subjective' | 'coding'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type SubmissionStatus = 'pending' | 'in_progress' | 'submitted' | 'evaluated' | 'shortlisted' | 'rejected'

// Job & JD Parsing
export interface Job {
  id: string
  title: string
  company: string
  description: string
  parsed_skills: ParsedSkills
  experience_level: ExperienceLevel
  responsibilities: string[]
  recruiter_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ParsedSkills {
  technical: string[]
  soft: string[]
  tools: string[]
  domain_knowledge: string[]
}

export interface JDParseResult {
  title: string
  experience_level: ExperienceLevel
  skills: ParsedSkills
  responsibilities: string[]
  qualifications: string[]
}

// Assessment Configuration
export interface Assessment {
  id: string
  job_id: string
  title: string
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  config: AssessmentConfig
  questions: Question[]
  is_active: boolean
  created_at: string
}

export interface AssessmentConfig {
  mcq_count: number
  mcq_weightage: number
  subjective_count: number
  subjective_weightage: number
  coding_count: number
  coding_weightage: number
  shuffle_questions: boolean
  show_results_immediately: boolean
  allow_retake: boolean
}

// Questions
export interface Question {
  id: string
  assessment_id: string
  type: QuestionType
  difficulty: DifficultyLevel
  skill_tags: string[]
  marks: number
  content: QuestionContent
  order: number
}

export interface MCQContent {
  question: string
  options: string[]
  correct_answer: number // index of correct option
  explanation?: string
}

export interface SubjectiveContent {
  question: string
  expected_keywords: string[]
  rubric: string
  max_words?: number
  sample_answer?: string
}

export interface CodingContent {
  problem_statement: string
  input_format: string
  output_format: string
  constraints: string[]
  examples: CodingExample[]
  test_cases: TestCase[]
  starter_code?: Record<string, string> // language -> code
  time_limit_seconds: number
  memory_limit_mb: number
}

export interface CodingExample {
  input: string
  output: string
  explanation?: string
}

export interface TestCase {
  input: string
  expected_output: string
  is_hidden: boolean
  weight: number
}

export type QuestionContent = MCQContent | SubjectiveContent | CodingContent

// Candidate Submissions
export interface Submission {
  id: string
  candidate_id: string
  assessment_id: string
  job_id: string
  resume_url?: string
  resume_data?: ResumeData
  started_at: string
  submitted_at?: string
  answers: Answer[]
  status: SubmissionStatus
  scores?: SubmissionScores
  anti_cheat_flags?: AntiCheatFlags
}

export interface Answer {
  question_id: string
  question_type: QuestionType
  response: MCQAnswer | SubjectiveAnswer | CodingAnswer
  time_spent_seconds: number
}

export interface MCQAnswer {
  selected_option: number | null
}

export interface SubjectiveAnswer {
  text: string
}

export interface CodingAnswer {
  code: string
  language: string
  execution_results?: ExecutionResult[]
}

export interface ExecutionResult {
  test_case_index: number
  passed: boolean
  actual_output?: string
  error?: string
  execution_time_ms: number
}

// Scoring & Evaluation
export interface SubmissionScores {
  total_score: number
  total_possible: number
  percentage: number
  section_scores: SectionScores
  skill_scores: Record<string, number>
  rank?: number
  evaluation_feedback?: EvaluationFeedback
}

export interface SectionScores {
  mcq: { score: number; total: number; correct: number; attempted: number }
  subjective: { score: number; total: number; evaluated: number }
  coding: { score: number; total: number; test_cases_passed: number; total_test_cases: number }
}

export interface EvaluationFeedback {
  strengths: string[]
  weaknesses: string[]
  skill_gaps: string[]
  overall_assessment: string
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
}

// Anti-cheat & Validation
export interface AntiCheatFlags {
  tab_switches: number
  copy_paste_detected: boolean
  time_anomalies: boolean
  resume_skill_mismatch: boolean
  suspicious_patterns: string[]
}

// Resume Data (from existing ResumeContext)
export interface ResumeData {
  atsScore: number
  skills: string[]
  personalInfo: {
    name: string
    email: string
    phone: string
  }
  experience: Array<{
    company: string
    position: string
    duration: string
  }>
  education: Array<{
    institution: string
    degree: string
    field: string
  }>
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number
  candidate_id: string
  candidate_name: string
  total_score: number
  percentage: number
  section_scores: SectionScores
  submitted_at: string
  status: SubmissionStatus
}

// Recruiter Dashboard Stats
export interface JobStats {
  job_id: string
  total_applicants: number
  completed_assessments: number
  pending_evaluations: number
  shortlisted: number
  rejected: number
  average_score: number
  top_score: number
}
