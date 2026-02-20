/**
 * Job Service - Supabase Implementation
 * Manages jobs, assessments, and questions in Supabase
 * Replaces localStorage 'assessai_jobs' usage
 */

import { supabase } from './supabase'
import type { Job, Assessment, Question, AssessmentConfig, ParsedSkills, ExperienceLevel } from './types'

/**
 * Normalize experience level to match database constraint
 * Database allows: 'fresher', 'junior', 'mid', 'senior'
 */
function normalizeExperienceLevel(level: string | undefined | null): ExperienceLevel {
    if (!level) return 'fresher'
    
    const normalized = level.toLowerCase().trim()
    
    // Map common variations to allowed values
    const mapping: Record<string, ExperienceLevel> = {
        'fresher': 'fresher',
        'fresh': 'fresher',
        'entry': 'fresher',
        'entry-level': 'fresher',
        'beginner': 'fresher',
        'junior': 'junior',
        'jr': 'junior',
        'associate': 'junior',
        'mid': 'mid',
        'middle': 'mid',
        'intermediate': 'mid',
        'mid-level': 'mid',
        'senior': 'senior',
        'sr': 'senior',
        'lead': 'senior',
        'principal': 'senior',
        'expert': 'senior'
    }
    
    return mapping[normalized] || 'fresher' // Default to fresher if unknown
}

/**
 * Normalize difficulty level to match database constraint
 * Database allows: 'easy', 'medium', 'hard'
 */
function normalizeDifficulty(difficulty: string | undefined | null): 'easy' | 'medium' | 'hard' {
    if (!difficulty) return 'medium'
    
    const normalized = difficulty.toLowerCase().trim()
    
    // Map common variations to allowed values
    const mapping: Record<string, 'easy' | 'medium' | 'hard'> = {
        'easy': 'easy',
        'easiest': 'easy',
        'beginner': 'easy',
        'simple': 'easy',
        'medium': 'medium',
        'med': 'medium',
        'intermediate': 'medium',
        'moderate': 'medium',
        'hard': 'hard',
        'difficult': 'hard',
        'advanced': 'hard',
        'expert': 'hard',
        'challenging': 'hard'
    }
    
    return mapping[normalized] || 'medium' // Default to medium if unknown
}

export interface JobWithAssessment extends Job {
    assessment?: Assessment
    questions?: Question[]
    candidatesCount?: number
    questionsCount?: number
    status?: 'draft' | 'active' | 'closed'
}

/**
 * Create a new job with assessment and questions
 */
export async function createJobWithAssessment(data: {
    title: string
    company: string
    description: string
    parsed_skills: ParsedSkills
    experience_level: ExperienceLevel
    responsibilities?: string[]
    config: AssessmentConfig
    questions: Question[]
    recruiter_id: string
    status?: 'draft' | 'active' | 'closed'
}): Promise<{ job: Job; assessment: Assessment; questions: Question[] } | null> {
    try {
        // Normalize experience level to ensure it matches database constraint
        const normalizedExperienceLevel = normalizeExperienceLevel(data.experience_level)
        
        // 1. Create job
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                title: data.title,
                company: data.company,
                description: data.description,
                parsed_skills: data.parsed_skills,
                experience_level: normalizedExperienceLevel,
                responsibilities: data.responsibilities || [],
                recruiter_id: data.recruiter_id,
                is_active: data.status === 'active'
            })
            .select()
            .single()

        if (jobError) {
            console.error('Error creating job:', jobError)
            console.error('Job data:', {
                title: data.title,
                company: data.company,
                experience_level_received: data.experience_level,
                experience_level_normalized: normalizedExperienceLevel,
                recruiter_id: data.recruiter_id
            })
            
            // Provide more helpful error message
            if (jobError.code === '23514') {
                console.error('Database constraint violation. Check that experience_level is one of: fresher, junior, mid, senior')
            }
            
            return null
        }

        // 2. Create assessment
        const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .insert({
                job_id: job.id,
                title: data.title,
                duration_minutes: data.config.duration_minutes || 60,
                total_marks: 100, // Calculate from questions
                passing_percentage: data.config.passing_percentage || 50,
                config: data.config,
                is_active: data.status === 'active'
            })
            .select()
            .single()

        if (assessmentError) {
            console.error('Error creating assessment:', assessmentError)
            // Rollback: delete job
            await supabase.from('jobs').delete().eq('id', job.id)
            return null
        }

        // 3. Create questions
        const questionsToInsert = data.questions.map((q, index) => ({
            assessment_id: assessment.id,
            type: q.type,
            difficulty: normalizeDifficulty(q.difficulty),
            skill_tags: q.skill_tags || [],
            marks: q.marks || 10,
            content: q.content,
            question_order: q.order || index
        }))

        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .insert(questionsToInsert)
            .select()

        if (questionsError) {
            console.error('Error creating questions:', questionsError)
            console.error('Questions data:', questionsToInsert.map(q => ({
                type: q.type,
                difficulty: q.difficulty,
                has_content: !!q.content
            })))
            
            // Provide more helpful error message for constraint violations
            if (questionsError.code === '23514') {
                console.error('Database constraint violation. Check that difficulty is one of: easy, medium, hard (lowercase)')
                console.error('Received difficulty values:', questionsToInsert.map(q => q.difficulty))
            }
            
            // Rollback: delete assessment and job
            await supabase.from('assessments').delete().eq('id', assessment.id)
            await supabase.from('jobs').delete().eq('id', job.id)
            return null
        }

        return {
            job: job as Job,
            assessment: assessment as Assessment,
            questions: questions as Question[]
        }
    } catch (error) {
        console.error('Error in createJobWithAssessment:', error)
        return null
    }
}

/**
 * Get all jobs for a recruiter
 */
export async function getJobsByRecruiter(recruiterId: string): Promise<JobWithAssessment[]> {
    try {
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select(`
                *,
                assessments (
                    *,
                    questions (*)
                )
            `)
            .eq('recruiter_id', recruiterId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching jobs:', error)
            return []
        }

        // Get candidate counts for each job
        const jobsWithCounts = await Promise.all(
            (jobs || []).map(async (job: any) => {
                const { count } = await supabase
                    .from('submissions')
                    .select('*', { count: 'exact', head: true })
                    .eq('job_id', job.id)

                const assessment = job.assessments?.[0]
                const questions = assessment?.questions || []

                return {
                    ...job,
                    assessment: assessment,
                    questions: questions,
                    candidatesCount: count || 0,
                    questionsCount: questions.length,
                    status: job.is_active ? 'active' : 'draft'
                } as JobWithAssessment
            })
        )

        return jobsWithCounts
    } catch (error) {
        console.error('Error in getJobsByRecruiter:', error)
        return []
    }
}

/**
 * Get all active jobs (for candidates)
 */
export async function getActiveJobs(): Promise<JobWithAssessment[]> {
    try {
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select(`
                *,
                assessments (
                    *,
                    questions (*)
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching active jobs:', error)
            return []
        }

        return (jobs || []).map((job: any) => {
            const assessment = job.assessments?.[0]
            const questions = assessment?.questions || []
            return {
                ...job,
                assessment: assessment,
                questions: questions,
                candidatesCount: 0,
                questionsCount: questions.length,
                status: 'active' as const
            } as JobWithAssessment
        })
    } catch (error) {
        console.error('Error in getActiveJobs:', error)
        return []
    }
}

/**
 * Get a single job by ID
 */
export async function getJobById(jobId: string): Promise<JobWithAssessment | null> {
    try {
        const { data: job, error } = await supabase
            .from('jobs')
            .select(`
                *,
                assessments (
                    *,
                    questions (*)
                )
            `)
            .eq('id', jobId)
            .single()

        if (error) {
            console.error('Error fetching job:', error)
            return null
        }

        if (!job) return null

        const assessment = job.assessments?.[0]
        const questions = assessment?.questions || []

        // Get candidate count
        const { count } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id)

        return {
            ...job,
            assessment: assessment,
            questions: questions,
            candidatesCount: count || 0,
            questionsCount: questions.length,
            status: job.is_active ? 'active' : 'draft'
        } as JobWithAssessment
    } catch (error) {
        console.error('Error in getJobById:', error)
        return null
    }
}

/**
 * Get assessment by job ID
 */
export async function getAssessmentByJobId(jobId: string): Promise<Assessment | null> {
    try {
        const { data: assessment, error } = await supabase
            .from('assessments')
            .select(`
                *,
                questions (*)
            `)
            .eq('job_id', jobId)
            .single()

        if (error) {
            console.error('Error fetching assessment:', error)
            return null
        }

        return assessment as Assessment
    } catch (error) {
        console.error('Error in getAssessmentByJobId:', error)
        return null
    }
}

/**
 * Update job status
 */
export async function updateJobStatus(
    jobId: string,
    status: 'draft' | 'active' | 'closed'
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('jobs')
            .update({
                is_active: status === 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)

        if (error) {
            console.error('Error updating job status:', error)
            return false
        }

        // Also update assessment status
        await supabase
            .from('assessments')
            .update({ is_active: status === 'active' })
            .eq('job_id', jobId)

        return true
    } catch (error) {
        console.error('Error in updateJobStatus:', error)
        return false
    }
}

/**
 * Delete a job (cascades to assessments and questions)
 */
export async function deleteJob(jobId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId)

        if (error) {
            console.error('Error deleting job:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error in deleteJob:', error)
        return false
    }
}

/**
 * Update job details
 */
export async function updateJob(
    jobId: string,
    updates: Partial<{
        title: string
        company: string
        description: string
        parsed_skills: ParsedSkills
        experience_level: ExperienceLevel
        responsibilities: string[]
        is_active: boolean
    }>
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('jobs')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)

        if (error) {
            console.error('Error updating job:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error in updateJob:', error)
        return false
    }
}

/**
 * Fallback: Get jobs from localStorage (for migration period)
 */
export function getJobsFromLocalStorage(): any[] {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
    } catch {
        return []
    }
}
