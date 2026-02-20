/**
 * Migration Service
 * One-time utility to migrate localStorage data to Supabase
 * Run this after setting up Supabase database
 */

import { supabase } from './supabase'
import { createJobWithAssessment } from './jobService'
import { saveSubmission } from './submissionServiceSupabase'

/**
 * Migrate all jobs from localStorage to Supabase
 */
export async function migrateJobsToSupabase(recruiterId: string): Promise<{
    success: number
    failed: number
    errors: string[]
}> {
    if (typeof window === 'undefined') {
        return { success: 0, failed: 0, errors: ['Not in browser environment'] }
    }

    const errors: string[] = []
    let success = 0
    let failed = 0

    try {
        const jobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')

        for (const job of jobs) {
            try {
                // Check if job already exists in Supabase
                const { data: existing } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('id', job.id)
                    .single()

                if (existing) {
                    console.log(`Job ${job.id} already exists, skipping`)
                    continue
                }

                // Migrate job
                const result = await createJobWithAssessment({
                    title: job.title,
                    company: job.company,
                    description: job.description || '',
                    parsed_skills: job.parsed_skills || {
                        technical: [],
                        soft: [],
                        tools: [],
                        domain_knowledge: []
                    },
                    experience_level: job.experience_level || 'fresher',
                    responsibilities: job.responsibilities || [],
                    config: job.config || {
                        mcq_count: 10,
                        mcq_weightage: 30,
                        subjective_count: 3,
                        subjective_weightage: 30,
                        coding_count: 2,
                        coding_weightage: 40,
                        shuffle_questions: true,
                        show_results_immediately: false,
                        allow_retake: false,
                        duration_minutes: 60,
                        passing_percentage: 50
                    },
                    questions: job.questions || [],
                    recruiter_id: recruiterId,
                    status: job.status || 'draft'
                })

                if (result) {
                    success++
                    console.log(`Migrated job: ${job.title}`)
                } else {
                    failed++
                    errors.push(`Failed to migrate job: ${job.title}`)
                }
            } catch (error: any) {
                failed++
                errors.push(`Error migrating job ${job.id}: ${error.message}`)
                console.error('Migration error:', error)
            }
        }
    } catch (error: any) {
        errors.push(`Fatal error: ${error.message}`)
    }

    return { success, failed, errors }
}

/**
 * Migrate all submissions from localStorage to Supabase
 */
export async function migrateSubmissionsToSupabase(): Promise<{
    success: number
    failed: number
    errors: string[]
}> {
    if (typeof window === 'undefined') {
        return { success: 0, failed: 0, errors: ['Not in browser environment'] }
    }

    const errors: string[] = []
    let success = 0
    let failed = 0

    try {
        const submissions = JSON.parse(localStorage.getItem('recruiter_submissions') || '[]')

        for (const submission of submissions) {
            try {
                // Check if submission already exists
                const { data: existing } = await supabase
                    .from('submissions')
                    .select('id')
                    .eq('id', submission.id)
                    .single()

                if (existing) {
                    console.log(`Submission ${submission.id} already exists, skipping`)
                    continue
                }

                // Get job data
                const jobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const job = jobs.find((j: any) => j.id === submission.jobId || j.id === submission.assessmentId)

                if (!job) {
                    failed++
                    errors.push(`Job not found for submission: ${submission.id}`)
                    continue
                }

                // Migrate submission
                const result = await saveSubmission({
                    assessmentId: submission.assessmentId,
                    candidateInfo: submission.candidateInfo,
                    answers: submission.answers,
                    antiCheatData: submission.antiCheatData,
                    submittedAt: submission.submittedAt,
                    job: job,
                    plagiarismData: submission.plagiarismData,
                    botDetectionData: submission.botDetectionData
                })

                if (result) {
                    // Save scores if available
                    if (submission.scores) {
                        await supabase
                            .from('scores')
                            .upsert({
                                submission_id: result.id,
                                total_score: submission.scores.totalScore,
                                total_possible: submission.scores.totalPossible,
                                percentage: submission.scores.percentage,
                                section_scores: submission.scores.sectionScores,
                                skill_scores: submission.scores.skillScores
                            })
                    }

                    success++
                    console.log(`Migrated submission: ${submission.id}`)
                } else {
                    failed++
                    errors.push(`Failed to migrate submission: ${submission.id}`)
                }
            } catch (error: any) {
                failed++
                errors.push(`Error migrating submission ${submission.id}: ${error.message}`)
                console.error('Migration error:', error)
            }
        }
    } catch (error: any) {
        errors.push(`Fatal error: ${error.message}`)
    }

    return { success, failed, errors }
}

/**
 * Run full migration (jobs + submissions)
 */
export async function runFullMigration(recruiterId: string): Promise<{
    jobs: { success: number; failed: number; errors: string[] }
    submissions: { success: number; failed: number; errors: string[] }
}> {
    console.log('Starting full migration...')

    const jobsResult = await migrateJobsToSupabase(recruiterId)
    console.log('Jobs migration complete:', jobsResult)

    const submissionsResult = await migrateSubmissionsToSupabase()
    console.log('Submissions migration complete:', submissionsResult)

    return {
        jobs: jobsResult,
        submissions: submissionsResult
    }
}

/**
 * Check migration status
 */
export async function checkMigrationStatus(): Promise<{
    localStorageJobs: number
    localStorageSubmissions: number
    supabaseJobs: number
    supabaseSubmissions: number
}> {
    if (typeof window === 'undefined') {
        return {
            localStorageJobs: 0,
            localStorageSubmissions: 0,
            supabaseJobs: 0,
            supabaseSubmissions: 0
        }
    }

    const localStorageJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]').length
    const localStorageSubmissions = JSON.parse(localStorage.getItem('recruiter_submissions') || '[]').length

    const { count: supabaseJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })

    const { count: supabaseSubmissions } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })

    return {
        localStorageJobs,
        localStorageSubmissions,
        supabaseJobs: supabaseJobs || 0,
        supabaseSubmissions: supabaseSubmissions || 0
    }
}
