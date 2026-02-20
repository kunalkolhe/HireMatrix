/**
 * Submission Service - Supabase Implementation
 * Manages candidate submissions, answers, and scores in Supabase
 * Replaces localStorage 'recruiter_submissions' usage
 */

import { supabase } from './supabase'
import type { Answer, SubmissionStatus } from './types'

export interface CandidateSubmission {
    id: string
    assessmentId: string
    jobId: string
    jobTitle: string
    company: string
    candidateInfo: {
        name: string
        email: string
        userId?: string
        startedAt: string
    }
    answers: Record<string, Answer>
    antiCheatData: {
        tab_switches: number
        copy_paste_detected: boolean
        time_anomalies: boolean
        question_times: Record<string, number>
        suspicious_patterns: string[]
    }
    plagiarismData?: {
        subjective: Record<string, any>
        coding: Record<string, any>
        flagged: boolean
    }
    botDetectionData?: {
        isBot: boolean
        confidence: number
        riskScore: number
        flags: Array<{
            type: string
            severity: string
            description: string
        }>
    }
    submittedAt: string
    status: SubmissionStatus
    scores?: {
        totalScore: number
        totalPossible: number
        percentage: number
        sectionScores: {
            mcq: { score: number; total: number; correct: number; totalQuestions: number }
            subjective: { score: number; total: number; evaluated: number; totalQuestions: number }
            coding: { score: number; total: number; testCasesPassed: number; totalTestCases: number }
        }
        skillScores: Record<string, { score: number; total: number; percentage: number }>
    }
    resumeData?: any
}

/**
 * Save a submission to Supabase
 */
export async function saveSubmission(submissionData: {
    assessmentId: string
    candidateInfo: any
    answers: Record<string, Answer>
    antiCheatData: any
    submittedAt: string
    job: any
    plagiarismData?: any
    botDetectionData?: any
}): Promise<CandidateSubmission | null> {
    try {
        // Get or create candidate user ID
        let candidateId = submissionData.candidateInfo.userId

        // Fetch resume data if candidate is logged in
        let resumeDataForSubmission = null
        if (candidateId) {
            try {
                const { getResumeData } = await import('@/lib/resumeService')
                const resumeData = await getResumeData(candidateId)
                if (resumeData) {
                    resumeDataForSubmission = {
                        skills: resumeData.skills || [],
                        personalInfo: resumeData.personal_info || {},
                        experience: resumeData.experience || [],
                        education: resumeData.education || [],
                        summary: resumeData.summary || '',
                        achievements: resumeData.achievements || [],
                        certifications: resumeData.certifications || [],
                        languages: resumeData.languages || [],
                        projects: resumeData.projects || [],
                        atsScore: resumeData.ats_score || 0
                    }
                }
            } catch (error) {
                console.warn('Could not fetch resume data for submission:', error)
            }
        }

        // If no userId, try to find by email
        if (!candidateId) {
            // For anonymous submissions, we'll use a placeholder
            // In production, candidates should be authenticated
            candidateId = null
        }

        // Get the actual assessment ID from the job
        // The assessmentId passed might be a job ID, so we need to find the assessment
        let actualAssessmentId = submissionData.assessmentId
        
        // Check if assessmentId is actually a job ID (UUID format check)
        // If it's a job ID, find the assessment for that job
        if (submissionData.job?.id && submissionData.assessmentId === submissionData.job.id) {
            const { data: assessment, error: assessmentError } = await supabase
                .from('assessments')
                .select('id')
                .eq('job_id', submissionData.job.id)
                .maybeSingle() // Use maybeSingle() instead of single() to handle no rows
            
            if (assessmentError) {
                console.error('Error fetching assessment:', assessmentError)
                // Continue with the job ID as assessment ID (will fail at foreign key, but that's expected)
            } else if (assessment?.id) {
                actualAssessmentId = assessment.id
            } else {
                console.warn('Assessment not found for job:', submissionData.job.id, '- will use job ID')
                // Continue with job ID - this will cause a foreign key error, but we'll handle it
            }
        }

        // Prepare resume_data with candidate info
        const resumeDataWithCandidateInfo = {
            ...(resumeDataForSubmission || submissionData.candidateInfo.resumeData || {}),
            candidate_name: submissionData.candidateInfo.name,
            candidate_email: submissionData.candidateInfo.email
        }

        // 1. Create submission record
        const { data: submission, error: submissionError } = await supabase
            .from('submissions')
            .insert({
                candidate_id: candidateId,
                assessment_id: actualAssessmentId,
                job_id: submissionData.job.id,
                resume_data: resumeDataWithCandidateInfo,
                started_at: submissionData.candidateInfo.startedAt,
                submitted_at: submissionData.submittedAt,
                status: 'submitted' as SubmissionStatus,
                anti_cheat_flags: {
                    tab_switches: submissionData.antiCheatData.tab_switches || 0,
                    copy_paste_detected: submissionData.antiCheatData.copy_paste_detected || false,
                    time_anomalies: submissionData.antiCheatData.time_anomalies || false,
                    question_times: submissionData.antiCheatData.question_times || {},
                    suspicious_patterns: submissionData.antiCheatData.suspicious_patterns || []
                }
            })
            .select()
            .single()

        if (submissionError) {
            // If duplicate, try to update existing
            if (submissionError.code === '23505') { // Unique constraint violation
                const { data: existing } = await supabase
                    .from('submissions')
                    .select()
                    .eq('assessment_id', actualAssessmentId)
                    .eq('candidate_id', candidateId)
                    .single()

                if (existing) {
                    const { data: updated } = await supabase
                        .from('submissions')
                        .update({
                            submitted_at: submissionData.submittedAt,
                            status: 'submitted',
                            anti_cheat_flags: {
                                tab_switches: submissionData.antiCheatData.tab_switches || 0,
                                copy_paste_detected: submissionData.antiCheatData.copy_paste_detected || false,
                                time_anomalies: submissionData.antiCheatData.time_anomalies || false,
                                question_times: submissionData.antiCheatData.question_times || {},
                                suspicious_patterns: submissionData.antiCheatData.suspicious_patterns || []
                            }
                        })
                        .eq('id', existing.id)
                        .select()
                        .single()

                    if (updated) {
                        await saveAnswers(updated.id, submissionData.answers)
                        // Update resume_data if we have it (including candidate info)
                        const resumeDataWithCandidateInfo = {
                            ...(resumeDataForSubmission || {}),
                            candidate_name: submissionData.candidateInfo.name,
                            candidate_email: submissionData.candidateInfo.email
                        }
                        await supabase
                            .from('submissions')
                            .update({ resume_data: resumeDataWithCandidateInfo })
                            .eq('id', updated.id)
                        return formatSubmission(updated, submissionData, resumeDataForSubmission)
                    }
                }
            }

            console.error('Error creating submission:', submissionError)
            return null
        }

        // 2. Save answers
        await saveAnswers(submission.id, submissionData.answers)

        // Note: resume_data with candidate info was already set during insert above,
        // so no need to update it again here

        // 4. Format and return
        return formatSubmission(submission, submissionData, resumeDataForSubmission)
    } catch (error) {
        console.error('Error in saveSubmission:', error)
        return null
    }
}

/**
 * Save answers for a submission
 */
async function saveAnswers(submissionId: string, answers: Record<string, Answer>): Promise<void> {
    try {
        // Delete existing answers for this submission
        await supabase
            .from('answers')
            .delete()
            .eq('submission_id', submissionId)

        // Insert new answers
        const answersToInsert = Object.entries(answers).map(([questionId, answer]) => ({
            submission_id: submissionId,
            question_id: questionId,
            question_type: answer.question_type,
            response: answer.response,
            time_spent_seconds: answer.time_spent_seconds || 0
        }))

        if (answersToInsert.length > 0) {
            const { error } = await supabase
                .from('answers')
                .insert(answersToInsert)

            if (error) {
                console.error('Error saving answers:', error)
            }
        }
    } catch (error) {
        console.error('Error in saveAnswers:', error)
    }
}

/**
 * Format database submission to CandidateSubmission format
 */
function formatSubmission(dbSubmission: any, submissionData: any, resumeData?: any): CandidateSubmission {
    return {
        id: dbSubmission.id,
        assessmentId: dbSubmission.assessment_id,
        jobId: dbSubmission.job_id,
        jobTitle: submissionData.job.title,
        company: submissionData.job.company,
        candidateInfo: {
            name: submissionData.candidateInfo.name,
            email: submissionData.candidateInfo.email,
            userId: dbSubmission.candidate_id,
            startedAt: dbSubmission.started_at
        },
        answers: submissionData.answers,
        antiCheatData: dbSubmission.anti_cheat_flags || {},
        submittedAt: dbSubmission.submitted_at,
        status: dbSubmission.status,
        resumeData: resumeData || dbSubmission.resume_data || submissionData.candidateInfo.resumeData || null
    }
}

/**
 * Get submissions by candidate (user ID or email)
 */
export async function getSubmissionsByCandidate(candidateId?: string, candidateEmail?: string): Promise<CandidateSubmission[]> {
    try {
        let query = supabase
            .from('submissions')
            .select(`
                *,
                jobs (
                    title,
                    company
                )
            `)
            .order('submitted_at', { ascending: false })

        if (candidateId) {
            query = query.eq('candidate_id', candidateId)
        } else if (candidateEmail) {
            // Note: We can't query auth.users.email from client-side
            // If only email is provided without candidateId, we can't reliably find the user
            // Return empty array - caller should provide candidateId when available
            console.warn('Cannot lookup candidate by email alone. Please provide candidateId.')
            return []
        } else {
            // No candidate ID or email provided
            return []
        }

        const { data: submissions, error } = await query

        if (error) {
            console.error('Error fetching candidate submissions:', error)
            return []
        }

        // Format submissions with full data
        const formattedSubmissions = await Promise.all(
            (submissions || []).map(async (submission: any) => {
                // Get answers
                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('submission_id', submission.id)

                const answersMap: Record<string, Answer> = {}
                answers?.forEach((a: any) => {
                    answersMap[a.question_id] = {
                        question_type: a.question_type,
                        response: a.response,
                        time_spent_seconds: a.time_spent_seconds
                    }
                })

                // Get scores
                const { data: scores } = await supabase
                    .from('scores')
                    .select('*')
                    .eq('submission_id', submission.id)
                    .single()

                // Get candidate name and email
                let candidateName = 'Candidate'
                let candidateEmailValue = candidateEmail || ''
                
                // First, try to get from stored resume_data
                // resume_data is a JSONB field, so it could be an object with candidate_name/candidate_email
                if (submission.resume_data) {
                    if (typeof submission.resume_data === 'object' && submission.resume_data !== null) {
                        if (submission.resume_data.candidate_name) {
                            candidateName = String(submission.resume_data.candidate_name)
                        }
                        if (submission.resume_data.candidate_email) {
                            candidateEmailValue = String(submission.resume_data.candidate_email)
                        }
                    }
                }
                
                // Fallback to user_profiles if not in resume_data
                if (submission.candidate_id && candidateName === 'Candidate') {
                    try {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('full_name')
                            .eq('id', submission.candidate_id)
                            .maybeSingle()
                        if (profile?.full_name) {
                            candidateName = profile.full_name
                        }
                    } catch (e) {
                        console.warn('Could not fetch user profile:', e)
                    }
                }

                return {
                    id: submission.id,
                    assessmentId: submission.assessment_id,
                    jobId: submission.job_id,
                    jobTitle: submission.jobs?.title || '',
                    company: submission.jobs?.company || '',
                    candidateInfo: {
                        name: candidateName,
                        email: candidateEmailValue,
                        userId: submission.candidate_id,
                        startedAt: submission.started_at || new Date().toISOString()
                    },
                    answers: answersMap,
                    antiCheatData: submission.anti_cheat_flags || {},
                    submittedAt: submission.submitted_at || new Date().toISOString(),
                    status: submission.status,
                    scores: scores ? {
                        totalScore: scores.total_score,
                        totalPossible: scores.total_possible,
                        percentage: scores.percentage,
                        sectionScores: scores.section_scores || {},
                        skillScores: scores.skill_scores || {}
                    } : undefined,
                    resumeData: submission.resume_data
                } as CandidateSubmission
            })
        )

        return formattedSubmissions
    } catch (error) {
        console.error('Error in getSubmissionsByCandidate:', error)
        return []
    }
}

/**
 * Get all submissions (for recruiter)
 */
export async function getAllSubmissions(): Promise<CandidateSubmission[]> {
    try {
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                *,
                jobs (
                    title,
                    company
                )
            `)
            .order('submitted_at', { ascending: false })

        if (error) {
            console.error('Error fetching submissions:', error)
            return []
        }

        // Get answers for each submission
        const submissionsWithAnswers = await Promise.all(
            (submissions || []).map(async (submission: any) => {
                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('submission_id', submission.id)

                const answersMap: Record<string, Answer> = {}
                answers?.forEach((a: any) => {
                    answersMap[a.question_id] = {
                        question_type: a.question_type,
                        response: a.response,
                        time_spent_seconds: a.time_spent_seconds
                    }
                })

                // Get scores
                const { data: scores } = await supabase
                    .from('scores')
                    .select('*')
                    .eq('submission_id', submission.id)
                    .single()

                // Get candidate name and email
                let candidateName = 'Candidate'
                let candidateEmail = ''
                
                // First, try to get from stored resume_data
                // resume_data is a JSONB field, so it could be an object with candidate_name/candidate_email
                if (submission.resume_data) {
                    if (typeof submission.resume_data === 'object' && submission.resume_data !== null) {
                        if (submission.resume_data.candidate_name) {
                            candidateName = String(submission.resume_data.candidate_name)
                        }
                        if (submission.resume_data.candidate_email) {
                            candidateEmail = String(submission.resume_data.candidate_email)
                        }
                    }
                }
                
                // Fallback to user_profiles if not in resume_data
                if (submission.candidate_id && candidateName === 'Candidate') {
                    try {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('full_name')
                            .eq('id', submission.candidate_id)
                            .maybeSingle()
                        if (profile?.full_name) {
                            candidateName = profile.full_name
                        }
                    } catch (e) {
                        console.warn('Could not fetch user profile for candidate:', submission.candidate_id, e)
                    }
                }
                
                // Debug logging (only for getAllSubmissions to avoid spam)
                if (candidateName === 'Candidate' && submission.id) {
                    console.warn('Candidate name not found for submission:', submission.id, {
                        hasResumeData: !!submission.resume_data,
                        resumeDataType: typeof submission.resume_data,
                        candidateId: submission.candidate_id,
                        resumeDataKeys: submission.resume_data && typeof submission.resume_data === 'object' ? Object.keys(submission.resume_data) : []
                    })
                }

                return {
                    id: submission.id,
                    assessmentId: submission.assessment_id,
                    jobId: submission.job_id,
                    jobTitle: submission.jobs?.title || '',
                    company: submission.jobs?.company || '',
                    candidateInfo: {
                        name: candidateName,
                        email: candidateEmail,
                        userId: submission.candidate_id,
                        startedAt: submission.started_at
                    },
                    answers: answersMap,
                    antiCheatData: submission.anti_cheat_flags || {},
                    submittedAt: submission.submitted_at,
                    status: submission.status,
                    scores: scores ? {
                        totalScore: scores.total_score,
                        totalPossible: scores.total_possible,
                        percentage: scores.percentage,
                        sectionScores: scores.section_scores || {},
                        skillScores: scores.skill_scores || {}
                    } : undefined,
                    resumeData: submission.resume_data
                } as CandidateSubmission
            })
        )

        return submissionsWithAnswers
    } catch (error) {
        console.error('Error in getAllSubmissions:', error)
        return []
    }
}

/**
 * Get submissions by assessment ID
 */
export async function getSubmissionsByAssessment(assessmentId: string): Promise<CandidateSubmission[]> {
    try {
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                *,
                jobs (
                    title,
                    company
                )
            `)
            .eq('assessment_id', assessmentId)
            .order('submitted_at', { ascending: false })

        if (error) {
            console.error('Error fetching submissions:', error)
            return []
        }

        // Format submissions with full data
        const formattedSubmissions = await Promise.all(
            (submissions || []).map(async (submission: any) => {
                // Get answers
                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('submission_id', submission.id)

                const answersMap: Record<string, Answer> = {}
                answers?.forEach((a: any) => {
                    answersMap[a.question_id] = {
                        question_type: a.question_type,
                        response: a.response,
                        time_spent_seconds: a.time_spent_seconds
                    }
                })

                // Get scores
                const { data: scores } = await supabase
                    .from('scores')
                    .select('*')
                    .eq('submission_id', submission.id)
                    .single()

                // Get candidate name and email
                let candidateName = 'Candidate'
                let candidateEmail = ''
                
                // First, try to get from stored resume_data
                // resume_data is a JSONB field, so it could be an object with candidate_name/candidate_email
                if (submission.resume_data) {
                    if (typeof submission.resume_data === 'object' && submission.resume_data !== null) {
                        if (submission.resume_data.candidate_name) {
                            candidateName = String(submission.resume_data.candidate_name)
                        }
                        if (submission.resume_data.candidate_email) {
                            candidateEmail = String(submission.resume_data.candidate_email)
                        }
                    }
                }
                
                // Fallback to user_profiles if not in resume_data
                if (submission.candidate_id && candidateName === 'Candidate') {
                    try {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('full_name')
                            .eq('id', submission.candidate_id)
                            .maybeSingle()
                        if (profile?.full_name) {
                            candidateName = profile.full_name
                        }
                    } catch (e) {
                        console.warn('Could not fetch user profile for candidate:', submission.candidate_id, e)
                    }
                }
                
                // Debug logging (only for getAllSubmissions to avoid spam)
                if (candidateName === 'Candidate' && submission.id) {
                    console.warn('Candidate name not found for submission:', submission.id, {
                        hasResumeData: !!submission.resume_data,
                        resumeDataType: typeof submission.resume_data,
                        candidateId: submission.candidate_id,
                        resumeDataKeys: submission.resume_data && typeof submission.resume_data === 'object' ? Object.keys(submission.resume_data) : []
                    })
                }

                return {
                    id: submission.id,
                    assessmentId: submission.assessment_id,
                    jobId: submission.job_id,
                    jobTitle: submission.jobs?.title || '',
                    company: submission.jobs?.company || '',
                    candidateInfo: {
                        name: candidateName,
                        email: candidateEmail,
                        userId: submission.candidate_id,
                        startedAt: submission.started_at || new Date().toISOString()
                    },
                    answers: answersMap,
                    antiCheatData: submission.anti_cheat_flags || {},
                    submittedAt: submission.submitted_at || new Date().toISOString(),
                    status: submission.status,
                    scores: scores ? {
                        totalScore: scores.total_score,
                        totalPossible: scores.total_possible,
                        percentage: scores.percentage,
                        sectionScores: scores.section_scores || {},
                        skillScores: scores.skill_scores || {}
                    } : undefined,
                    resumeData: submission.resume_data
                } as CandidateSubmission
            })
        )

        return formattedSubmissions
    } catch (error) {
        console.error('Error in getSubmissionsByAssessment:', error)
        return []
    }
}

/**
 * Get submissions by job ID
 */
export async function getSubmissionsByJob(jobId: string): Promise<CandidateSubmission[]> {
    try {
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                *,
                jobs (
                    title,
                    company
                )
            `)
            .eq('job_id', jobId)
            .order('submitted_at', { ascending: false })

        if (error) {
            console.error('Error fetching submissions:', error)
            return []
        }

        // Format submissions with full data
        const formattedSubmissions = await Promise.all(
            (submissions || []).map(async (submission: any) => {
                // Get answers
                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('submission_id', submission.id)

                const answersMap: Record<string, Answer> = {}
                answers?.forEach((a: any) => {
                    answersMap[a.question_id] = {
                        question_type: a.question_type,
                        response: a.response,
                        time_spent_seconds: a.time_spent_seconds
                    }
                })

                // Get scores
                const { data: scores } = await supabase
                    .from('scores')
                    .select('*')
                    .eq('submission_id', submission.id)
                    .single()

                // Get candidate name and email
                let candidateName = 'Candidate'
                let candidateEmail = ''
                
                // First, try to get from stored resume_data
                // resume_data is a JSONB field, so it could be an object with candidate_name/candidate_email
                if (submission.resume_data) {
                    if (typeof submission.resume_data === 'object' && submission.resume_data !== null) {
                        if (submission.resume_data.candidate_name) {
                            candidateName = String(submission.resume_data.candidate_name)
                        }
                        if (submission.resume_data.candidate_email) {
                            candidateEmail = String(submission.resume_data.candidate_email)
                        }
                    }
                }
                
                // Fallback to user_profiles if not in resume_data
                if (submission.candidate_id && candidateName === 'Candidate') {
                    try {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('full_name')
                            .eq('id', submission.candidate_id)
                            .maybeSingle()
                        if (profile?.full_name) {
                            candidateName = profile.full_name
                        }
                    } catch (e) {
                        console.warn('Could not fetch user profile for candidate:', submission.candidate_id, e)
                    }
                }
                
                // Debug logging (only for getAllSubmissions to avoid spam)
                if (candidateName === 'Candidate' && submission.id) {
                    console.warn('Candidate name not found for submission:', submission.id, {
                        hasResumeData: !!submission.resume_data,
                        resumeDataType: typeof submission.resume_data,
                        candidateId: submission.candidate_id,
                        resumeDataKeys: submission.resume_data && typeof submission.resume_data === 'object' ? Object.keys(submission.resume_data) : []
                    })
                }

                return {
                    id: submission.id,
                    assessmentId: submission.assessment_id,
                    jobId: submission.job_id,
                    jobTitle: submission.jobs?.title || '',
                    company: submission.jobs?.company || '',
                    candidateInfo: {
                        name: candidateName,
                        email: candidateEmail,
                        userId: submission.candidate_id,
                        startedAt: submission.started_at || new Date().toISOString()
                    },
                    answers: answersMap,
                    antiCheatData: submission.anti_cheat_flags || {},
                    submittedAt: submission.submitted_at || new Date().toISOString(),
                    status: submission.status,
                    scores: scores ? {
                        totalScore: scores.total_score,
                        totalPossible: scores.total_possible,
                        percentage: scores.percentage,
                        sectionScores: scores.section_scores || {},
                        skillScores: scores.skill_scores || {}
                    } : undefined,
                    resumeData: submission.resume_data
                } as CandidateSubmission
            })
        )

        return formattedSubmissions
    } catch (error) {
        console.error('Error in getSubmissionsByJob:', error)
        return []
    }
}

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}

/**
 * Get submission by ID
 * Handles both UUID (Supabase) and old localStorage format IDs
 */
export async function getSubmissionById(submissionId: string): Promise<CandidateSubmission | null> {
    try {
        // If it's not a valid UUID, it's likely an old localStorage ID
        // Try to find by other means or return null to fall back to localStorage
        if (!isValidUUID(submissionId)) {
            console.warn('Submission ID is not a valid UUID, likely from localStorage:', submissionId)
            return null // Fall back to localStorage lookup
        }

        const { data: submission, error } = await supabase
            .from('submissions')
            .select(`
                *,
                jobs (
                    title,
                    company
                )
            `)
            .eq('id', submissionId)
            .single()

        if (error || !submission) {
            console.error('Error fetching submission:', error)
            return null
        }

        // Get answers
        const { data: answers } = await supabase
            .from('answers')
            .select('*')
            .eq('submission_id', submission.id)

        const answersMap: Record<string, Answer> = {}
        answers?.forEach((a: any) => {
            answersMap[a.question_id] = {
                question_type: a.question_type,
                response: a.response,
                time_spent_seconds: a.time_spent_seconds
            }
        })

        // Get scores
        const { data: scores } = await supabase
            .from('scores')
            .select('*')
            .eq('submission_id', submission.id)
            .single()

        // Get candidate name and email
        let candidateName = 'Candidate'
        let candidateEmail = ''
        
        // First, try to get from stored resume_data
        // resume_data is a JSONB field, so it could be an object with candidate_name/candidate_email
        if (submission.resume_data) {
            if (typeof submission.resume_data === 'object' && submission.resume_data !== null) {
                if (submission.resume_data.candidate_name) {
                    candidateName = String(submission.resume_data.candidate_name)
                }
                if (submission.resume_data.candidate_email) {
                    candidateEmail = String(submission.resume_data.candidate_email)
                }
            }
        }
        
        // Fallback to user_profiles if not in resume_data
        if (submission.candidate_id && candidateName === 'Candidate') {
            try {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('id', submission.candidate_id)
                    .maybeSingle()
                
                if (profile?.full_name) {
                    candidateName = profile.full_name
                }
            } catch (e) {
                console.warn('Could not fetch user profile:', e)
            }
        }

        return {
            id: submission.id,
            assessmentId: submission.assessment_id,
            jobId: submission.job_id,
            jobTitle: submission.jobs?.title || '',
            company: submission.jobs?.company || '',
            candidateInfo: {
                name: candidateName,
                email: candidateEmail,
                userId: submission.candidate_id,
                startedAt: submission.started_at || new Date().toISOString()
            },
            answers: answersMap,
            antiCheatData: submission.anti_cheat_flags || {},
            submittedAt: submission.submitted_at || new Date().toISOString(),
            status: submission.status,
            scores: scores ? {
                totalScore: scores.total_score,
                totalPossible: scores.total_possible,
                percentage: scores.percentage,
                sectionScores: scores.section_scores || {},
                skillScores: scores.skill_scores || {}
            } : undefined,
            resumeData: submission.resume_data
        } as CandidateSubmission
    } catch (error) {
        console.error('Error in getSubmissionById:', error)
        return null
    }
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
    submissionId: string,
    status: SubmissionStatus
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('submissions')
            .update({ status })
            .eq('id', submissionId)

        if (error) {
            console.error('Error updating submission status:', error)
            return false
        }

        // Dispatch event to notify UI of update
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('submissionUpdated'))
        }

        return true
    } catch (error) {
        console.error('Error in updateSubmissionStatus:', error)
        return false
    }
}

/**
 * Save submission scores
 */
export async function saveSubmissionScores(
    submissionId: string,
    scores: CandidateSubmission['scores'],
    passingPercentage?: number
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('scores')
            .upsert({
                submission_id: submissionId,
                total_score: scores?.totalScore || 0,
                total_possible: scores?.totalPossible || 0,
                percentage: scores?.percentage || 0,
                section_scores: scores?.sectionScores || {},
                skill_scores: scores?.skillScores || {}
            }, {
                onConflict: 'submission_id'
            })

        if (error) {
            console.error('Error saving scores:', error)
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            })
            return false
        }

        // Determine status based on passing threshold
        // If passingPercentage is provided, check if candidate passed
        let status: SubmissionStatus = 'evaluated'
        
        if (passingPercentage !== undefined) {
            const candidatePercentage = scores?.percentage || 0
            if (candidatePercentage >= passingPercentage) {
                status = 'shortlisted'
                console.log(`Candidate passed with ${candidatePercentage}% (threshold: ${passingPercentage}%)`)
            } else {
                status = 'evaluated'
                console.log(`Candidate did not pass with ${candidatePercentage}% (threshold: ${passingPercentage}%)`)
            }
        } else {
            // If no passing percentage provided, try to get it from the assessment
            try {
                // Get submission to find assessment_id
                const { data: submission } = await supabase
                    .from('submissions')
                    .select('assessment_id')
                    .eq('id', submissionId)
                    .single()

                if (submission?.assessment_id) {
                    // Get assessment to find passing_percentage
                    const { data: assessment } = await supabase
                        .from('assessments')
                        .select('passing_percentage')
                        .eq('id', submission.assessment_id)
                        .single()

                    if (assessment?.passing_percentage !== undefined) {
                        const candidatePercentage = scores?.percentage || 0
                        if (candidatePercentage >= assessment.passing_percentage) {
                            status = 'shortlisted'
                            console.log(`Candidate passed with ${candidatePercentage}% (threshold: ${assessment.passing_percentage}%)`)
                        } else {
                            status = 'evaluated'
                            console.log(`Candidate did not pass with ${candidatePercentage}% (threshold: ${assessment.passing_percentage}%)`)
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not fetch passing percentage from assessment:', e)
                // Default to evaluated if we can't determine
            }
        }

        // Update submission status
        await updateSubmissionStatus(submissionId, status)

        return true
    } catch (error) {
        console.error('Error in saveSubmissionScores:', error)
        return false
    }
}

/**
 * Get submission statistics
 */
export async function getSubmissionStats() {
    try {
        const { count: total } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })

        const { count: pending } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

        const { count: evaluated } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'evaluated')

        // Get average score
        const { data: scores } = await supabase
            .from('scores')
            .select('percentage')

        const averageScore = scores && scores.length > 0
            ? scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length
            : 0

        return {
            total: total || 0,
            pending: pending || 0,
            evaluated: evaluated || 0,
            averageScore
        }
    } catch (error) {
        console.error('Error in getSubmissionStats:', error)
        return {
            total: 0,
            pending: 0,
            evaluated: 0,
            averageScore: 0
        }
    }
}
