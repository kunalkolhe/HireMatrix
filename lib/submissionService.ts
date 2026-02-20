/**
 * Submission Service
 * Collects and manages candidate submissions from sessionStorage
 * Stores them in localStorage for recruiter access
 * Now with Supabase support (with localStorage fallback)
 */

import { Question, Answer } from './types'
import * as submissionServiceSupabase from './submissionServiceSupabase'

export interface CandidateSubmission {
    id: string // Unique submission ID
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
    answers: Record<string, Answer> // questionId -> Answer
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
    status: 'pending' | 'evaluated' | 'shortlisted' | 'rejected'
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

const STORAGE_KEY = 'recruiter_submissions'

/**
 * Collect submission from sessionStorage and store for recruiter
 * Now supports Supabase with localStorage fallback
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
}): Promise<CandidateSubmission> {
    // Try Supabase first
    try {
        const supabaseResult = await submissionServiceSupabase.saveSubmission({
            ...submissionData,
            plagiarismData: submissionData.plagiarismData,
            botDetectionData: submissionData.botDetectionData
        })
        
        if (supabaseResult) {
            // Also save to localStorage as backup
            const localSubmission = saveSubmissionLocalStorage(submissionData)
            
            // Dispatch event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('submissionUpdated'))
            }
            
            return supabaseResult
        }
    } catch (error) {
        console.warn('Supabase save failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    return saveSubmissionLocalStorage(submissionData)
}

/**
 * Save submission to localStorage (fallback)
 */
function saveSubmissionLocalStorage(submissionData: {
    assessmentId: string
    candidateInfo: any
    answers: Record<string, Answer>
    antiCheatData: any
    submittedAt: string
    job: any
}): CandidateSubmission {
    const submissionId = `${submissionData.assessmentId}_${submissionData.candidateInfo.email}_${Date.now()}`
    
    const submission: CandidateSubmission = {
        id: submissionId,
        assessmentId: submissionData.assessmentId,
        jobId: submissionData.job.id,
        jobTitle: submissionData.job.title,
        company: submissionData.job.company,
        candidateInfo: {
            name: submissionData.candidateInfo.name,
            email: submissionData.candidateInfo.email,
            userId: submissionData.candidateInfo.userId,
            startedAt: submissionData.candidateInfo.startedAt
        },
        answers: submissionData.answers,
        antiCheatData: submissionData.antiCheatData,
        submittedAt: submissionData.submittedAt,
        status: 'pending',
        resumeData: getResumeData(submissionData.assessmentId)
    }

    // Get existing submissions
    const existingSubmissions = getAllSubmissionsLocalStorage()
    
    // Check if submission already exists (same candidate, same assessment)
    const existingIndex = existingSubmissions.findIndex(
        s => s.assessmentId === submission.assessmentId && 
             s.candidateInfo.email === submission.candidateInfo.email
    )
    
    if (existingIndex >= 0) {
        // Update existing submission
        existingSubmissions[existingIndex] = submission
    } else {
        // Add new submission
        existingSubmissions.push(submission)
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSubmissions))
    
    // Update job candidate count
    updateJobCandidateCount(submission.jobId)
    
    // Dispatch custom event to notify other tabs/pages
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('submissionUpdated'))
    }
    
    return submission
}

/**
 * Get all submissions (with Supabase support)
 */
export async function getAllSubmissions(): Promise<CandidateSubmission[]> {
    // Try Supabase first
    try {
        const supabaseSubmissions = await submissionServiceSupabase.getAllSubmissions()
        if (supabaseSubmissions && supabaseSubmissions.length > 0) {
            return supabaseSubmissions
        }
    } catch (error) {
        console.warn('Supabase fetch failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    return getAllSubmissionsLocalStorage()
}

/**
 * Get all submissions from localStorage (fallback)
 */
function getAllSubmissionsLocalStorage(): CandidateSubmission[] {
    if (typeof window === 'undefined') return []
    
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch (error) {
        console.error('Error reading submissions:', error)
        return []
    }
}

/**
 * Update candidate count for a job
 */
function updateJobCandidateCount(jobId: string) {
    try {
        const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
        const jobIndex = savedJobs.findIndex((j: any) => j.id === jobId)
        
        if (jobIndex >= 0) {
            // Get submissions for this job (synchronous localStorage version)
            try {
                const allSubmissions = getAllSubmissionsLocalStorage()
                const submissionsForJob = allSubmissions.filter(s => s.jobId === jobId)
                savedJobs[jobIndex].candidatesCount = submissionsForJob.length
                localStorage.setItem('assessai_jobs', JSON.stringify(savedJobs))
            } catch (e) {
                // If getSubmissionsByJob fails, just set to 0 or keep existing count
                console.warn('Could not update candidate count:', e)
            }
        }
    } catch (error) {
        console.error('Error updating job candidate count:', error)
    }
}

/**
 * Get submissions for a specific assessment
 */
export async function getSubmissionsByAssessment(assessmentId: string): Promise<CandidateSubmission[]> {
    // Try Supabase first
    try {
        const supabaseSubmissions = await submissionServiceSupabase.getSubmissionsByAssessment(assessmentId)
        if (supabaseSubmissions && supabaseSubmissions.length > 0) {
            return supabaseSubmissions
        }
    } catch (error) {
        console.warn('Supabase fetch failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    const allSubmissions = getAllSubmissionsLocalStorage()
    return allSubmissions.filter(s => s.assessmentId === assessmentId)
}

/**
 * Get submissions for a specific candidate (by user ID or email)
 */
export async function getSubmissionsByCandidate(candidateId?: string, candidateEmail?: string): Promise<CandidateSubmission[]> {
    // Try Supabase first
    try {
        const supabaseSubmissions = await submissionServiceSupabase.getSubmissionsByCandidate(candidateId, candidateEmail)
        if (supabaseSubmissions && supabaseSubmissions.length > 0) {
            return supabaseSubmissions
        }
    } catch (error) {
        console.warn('Supabase fetch failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    const allSubmissions = getAllSubmissionsLocalStorage()
    if (candidateId) {
        return allSubmissions.filter(s => s.candidateInfo?.userId === candidateId)
    } else if (candidateEmail) {
        return allSubmissions.filter(s => s.candidateInfo?.email === candidateEmail)
    }
    return []
}

/**
 * Get submissions for a specific job
 */
export async function getSubmissionsByJob(jobId: string): Promise<CandidateSubmission[]> {
    // Try Supabase first
    try {
        const supabaseSubmissions = await submissionServiceSupabase.getSubmissionsByJob(jobId)
        if (supabaseSubmissions && supabaseSubmissions.length > 0) {
            return supabaseSubmissions
        }
    } catch (error) {
        console.warn('Supabase fetch failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    const allSubmissions = getAllSubmissionsLocalStorage()
    return allSubmissions.filter(s => s.jobId === jobId || s.assessmentId === jobId)
}

/**
 * Get a specific submission by ID
 */
export async function getSubmissionById(submissionId: string): Promise<CandidateSubmission | null> {
    // Try Supabase first
    try {
        const supabaseSubmission = await submissionServiceSupabase.getSubmissionById(submissionId)
        if (supabaseSubmission) {
            return supabaseSubmission
        }
    } catch (error) {
        console.warn('Supabase fetch failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    return getSubmissionByIdLocalStorage(submissionId)
}

/**
 * Get submission by ID from localStorage (fallback)
 */
function getSubmissionByIdLocalStorage(submissionId: string): CandidateSubmission | null {
    if (!submissionId) return null
    
    const submissions = getAllSubmissionsLocalStorage()
    // Try exact match first
    const found = submissions.find(s => s.id === submissionId)
    if (found) return found
    
    // Try URL decoded version
    try {
        const decoded = decodeURIComponent(submissionId)
        if (decoded !== submissionId) {
            const foundDecoded = submissions.find(s => s.id === decoded)
            if (foundDecoded) return foundDecoded
        }
    } catch (e) {
        // Ignore decode errors
    }
    
    return null
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
    submissionId: string, 
    status: 'pending' | 'evaluated' | 'shortlisted' | 'rejected'
): Promise<boolean> {
    // Check if it's a UUID (Supabase) or old format (localStorage)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)
    
    if (isUUID) {
        // Try Supabase first
        try {
            const { updateSubmissionStatus: updateSupabaseStatus } = await import('./submissionServiceSupabase')
            const updated = await updateSupabaseStatus(submissionId, status as any)
            if (updated) {
                // Dispatch event
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('submissionUpdated'))
                }
                return true
            }
        } catch (error) {
            console.warn('Supabase update failed, falling back to localStorage:', error)
        }
    }
    
    // Fallback to localStorage
    const submissions = getAllSubmissionsLocalStorage()
    const index = submissions.findIndex(s => s.id === submissionId)
    
    if (index >= 0) {
        submissions[index].status = status
        localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
        
        // Dispatch event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('submissionUpdated'))
        }
        
        return true
    }
    
    return false
}

/**
 * Update submission scores
 */
export async function updateSubmissionScores(
    submissionId: string, 
    scores: CandidateSubmission['scores'],
    passingPercentage?: number
): Promise<boolean> {
    // Check if it's a UUID (Supabase) or old format (localStorage)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)
    
    if (isUUID) {
        // Try Supabase first
        try {
            const { saveSubmissionScores } = await import('./submissionServiceSupabase')
            const scoresSaved = await saveSubmissionScores(submissionId, scores, passingPercentage)
            if (scoresSaved) {
                return true
            }
        } catch (error) {
            console.warn('Supabase update failed, falling back to localStorage:', error)
        }
    }
    
    // Fallback to localStorage
    const submissions = getAllSubmissionsLocalStorage()
    const index = submissions.findIndex(s => s.id === submissionId)
    
    if (index >= 0) {
        submissions[index].scores = scores
        
        // Check passing threshold
        const threshold = passingPercentage || 50
        const passed = (scores?.percentage || 0) >= threshold
        submissions[index].status = passed ? 'shortlisted' : 'evaluated'
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
        
        // Dispatch event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('submissionUpdated'))
        }
        
        return true
    }
    
    return false
}

/**
 * Get resume data from sessionStorage
 */
function getResumeData(assessmentId: string): any {
    if (typeof window === 'undefined') return null
    
    try {
        const data = sessionStorage.getItem(`resume_data_${assessmentId}`)
        return data ? JSON.parse(data) : null
    } catch {
        return null
    }
}

/**
 * Delete a submission
 */
export function deleteSubmission(submissionId: string): boolean {
    const submissions = getAllSubmissionsLocalStorage()
    const filtered = submissions.filter(s => s.id !== submissionId)
    
    if (filtered.length < submissions.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
        return true
    }
    
    return false
}

/**
 * Get statistics for recruiter dashboard
 */
export async function getSubmissionStats() {
    // Try Supabase first
    try {
        const supabaseStats = await submissionServiceSupabase.getSubmissionStats()
        if (supabaseStats) {
            return supabaseStats
        }
    } catch (error) {
        console.warn('Supabase stats failed, falling back to localStorage:', error)
    }
    
    // Fallback to localStorage
    const submissions = getAllSubmissionsLocalStorage()
    
    return {
        total: submissions.length,
        pending: submissions.filter(s => s.status === 'pending').length,
        evaluated: submissions.filter(s => s.status === 'evaluated').length,
        shortlisted: submissions.filter(s => s.status === 'shortlisted').length,
        rejected: submissions.filter(s => s.status === 'rejected').length,
        averageScore: submissions
            .filter(s => s.scores)
            .reduce((sum, s) => sum + (s.scores?.percentage || 0), 0) / 
            (submissions.filter(s => s.scores).length || 1)
    }
}

/**
 * Migrate existing submissions from sessionStorage to localStorage
 * This collects any submissions that candidates have already submitted
 */
export function migrateSubmissionsFromSessionStorage(): number {
    if (typeof window === 'undefined') return 0
    
    let migratedCount = 0
    const existingSubmissions = getAllSubmissionsLocalStorage()
    const existingEmails = new Set(existingSubmissions.map(s => `${s.assessmentId}_${s.candidateInfo.email}`))
    
    try {
        // Check all sessionStorage keys for submissions
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && key.startsWith('submission_')) {
                try {
                    const submissionData = JSON.parse(sessionStorage.getItem(key) || '{}')
                    
                    // Validate submission data
                    if (submissionData.assessmentId && 
                        submissionData.candidateInfo && 
                        submissionData.candidateInfo.email &&
                        submissionData.job &&
                        submissionData.answers) {
                        
                        const uniqueKey = `${submissionData.assessmentId}_${submissionData.candidateInfo.email}`
                        
                        // Only migrate if not already in localStorage
                        if (!existingEmails.has(uniqueKey)) {
                            try {
                                const submission = saveSubmission(submissionData)
                                
                                // Try to evaluate if questions are available
                                if (submissionData.job?.questions && Array.isArray(submissionData.job.questions)) {
                                    const { evaluateAndSaveSubmission } = require('./evaluationService')
                                    evaluateAndSaveSubmission(submission, submissionData.job.questions)
                                }
                                
                                migratedCount++
                                existingEmails.add(uniqueKey)
                            } catch (error) {
                                console.error('Error migrating submission:', error)
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing submission from sessionStorage:', error)
                }
            }
        }
    } catch (error) {
        console.error('Error migrating submissions:', error)
    }
    
    return migratedCount
}

/**
 * Collect all submissions from sessionStorage (for all assessments)
 * Useful for one-time migration or data recovery
 */
export function collectAllSessionSubmissions(): number {
    return migrateSubmissionsFromSessionStorage()
}
