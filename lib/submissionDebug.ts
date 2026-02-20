/**
 * Debug utilities for submission data
 * Helps diagnose data collection issues
 */

export function debugSubmissions() {
    if (typeof window === 'undefined') {
        console.log('Not in browser environment')
        return
    }

    console.log('=== SUBMISSION DEBUG ===')
    
    // Check localStorage
    const recruiterSubmissions = localStorage.getItem('recruiter_submissions')
    console.log('localStorage (recruiter_submissions):', recruiterSubmissions ? JSON.parse(recruiterSubmissions) : 'Empty')
    
    // Check sessionStorage for submissions
    const sessionSubmissions: any[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('submission_')) {
            try {
                const data = JSON.parse(sessionStorage.getItem(key) || '{}')
                sessionSubmissions.push({ key, data })
            } catch (e) {
                console.error('Error parsing', key, e)
            }
        }
    }
    console.log('sessionStorage submissions:', sessionSubmissions)
    
    // Check candidate info
    const candidateInfos: any[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('candidate_info_')) {
            try {
                const data = JSON.parse(sessionStorage.getItem(key) || '{}')
                candidateInfos.push({ key, data })
            } catch (e) {
                console.error('Error parsing', key, e)
            }
        }
    }
    console.log('sessionStorage candidate_info:', candidateInfos)
    
    // Check answers
    const answers: any[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('assessment_answers_')) {
            try {
                const data = JSON.parse(sessionStorage.getItem(key) || '{}')
                answers.push({ key, data })
            } catch (e) {
                console.error('Error parsing', key, e)
            }
        }
    }
    console.log('sessionStorage answers:', answers)
    
    // Check jobs
    const jobs = localStorage.getItem('assessai_jobs')
    console.log('localStorage (assessai_jobs):', jobs ? JSON.parse(jobs) : 'Empty')
    
    console.log('=== END DEBUG ===')
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
    (window as any).debugSubmissions = debugSubmissions
}
