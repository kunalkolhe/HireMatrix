/**
 * Advanced Bot Detection Service
 * Detects bot-driven, repeated, or suspicious application patterns
 */

import { CandidateSubmission, getAllSubmissions } from './submissionService'

export interface BotDetectionResult {
    isBot: boolean
    confidence: number // 0-100
    flags: Array<{
        type: 'repeated_application' | 'suspicious_timing' | 'pattern_detection' | 'guess_pattern' | 'identical_responses'
        severity: 'low' | 'medium' | 'high'
        description: string
        evidence: any
    }>
    riskScore: number // 0-100
}

/**
 * Detect repeated applications from same email/IP pattern
 */
function detectRepeatedApplications(
    submission: CandidateSubmission,
    allSubmissions: CandidateSubmission[]
): BotDetectionResult['flags'] {
    const flags: BotDetectionResult['flags'] = []
    
    // Check for multiple submissions from same email
    const sameEmailSubmissions = allSubmissions.filter(
        s => s.candidateInfo.email.toLowerCase() === submission.candidateInfo.email.toLowerCase() &&
             s.id !== submission.id
    )
    
    if (sameEmailSubmissions.length >= 3) {
        flags.push({
            type: 'repeated_application',
            severity: 'high',
            description: `Multiple submissions detected (${sameEmailSubmissions.length + 1} total)`,
            evidence: {
                count: sameEmailSubmissions.length + 1,
                submissions: sameEmailSubmissions.map(s => ({
                    id: s.id,
                    assessmentId: s.assessmentId,
                    submittedAt: s.submittedAt
                }))
            }
        })
    } else if (sameEmailSubmissions.length >= 1) {
        flags.push({
            type: 'repeated_application',
            severity: 'medium',
            description: `Duplicate submission detected from same email`,
            evidence: {
                count: sameEmailSubmissions.length + 1
            }
        })
    }
    
    return flags
}

/**
 * Detect suspicious timing patterns
 */
function detectSuspiciousTiming(submission: CandidateSubmission): BotDetectionResult['flags'] {
    const flags: BotDetectionResult['flags'] = []
    
    const startedAt = new Date(submission.candidateInfo.startedAt)
    const submittedAt = new Date(submission.submittedAt)
    const timeSpent = (submittedAt.getTime() - startedAt.getTime()) / 1000 / 60 // minutes
    
    // Check for extremely fast completion (< 5 minutes for full assessment)
    const totalQuestions = Object.keys(submission.answers).length
    if (totalQuestions > 10 && timeSpent < 5) {
        flags.push({
            type: 'suspicious_timing',
            severity: 'high',
            description: `Assessment completed in ${Math.round(timeSpent)} minutes (suspiciously fast)`,
            evidence: {
                timeSpent: Math.round(timeSpent),
                questionCount: totalQuestions,
                avgTimePerQuestion: Math.round((timeSpent / totalQuestions) * 60) // seconds
            }
        })
    }
    
    // Check question times for anomalies
    const questionTimes = submission.antiCheatData?.question_times || {}
    const times = Object.values(questionTimes) as number[]
    
    if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length
        const suspiciouslyFast = times.filter(t => t < avgTime * 0.2).length
        
        if (suspiciouslyFast > times.length * 0.5) {
            flags.push({
                type: 'suspicious_timing',
                severity: 'medium',
                description: `Many questions answered suspiciously fast`,
                evidence: {
                    fastAnswers: suspiciouslyFast,
                    totalAnswers: times.length
                }
            })
        }
    }
    
    return flags
}

/**
 * Detect guess patterns (random MCQ answers)
 */
function detectGuessPatterns(
    submission: CandidateSubmission,
    questions: Array<{ id: string; type: string; content?: any }>
): BotDetectionResult['flags'] {
    const flags: BotDetectionResult['flags'] = []
    
    const mcqAnswers: number[] = []
    
    for (const question of questions) {
        if (question.type === 'mcq') {
            const answer = submission.answers[question.id]
            const selected = answer?.response?.selected_option
            if (typeof selected === 'number') {
                mcqAnswers.push(selected)
            }
        }
    }
    
    if (mcqAnswers.length >= 5) {
        // Check for patterns
        const optionCounts = [0, 0, 0, 0]
        mcqAnswers.forEach(opt => {
            if (opt >= 0 && opt < 4) optionCounts[opt]++
        })
        
        // If one option is selected > 60% of the time, might be guessing
        const maxCount = Math.max(...optionCounts)
        const maxPercentage = (maxCount / mcqAnswers.length) * 100
        
        if (maxPercentage > 60) {
            flags.push({
                type: 'guess_pattern',
                severity: 'medium',
                description: `Suspicious answer pattern detected (${Math.round(maxPercentage)}% same option)`,
                evidence: {
                    optionDistribution: optionCounts,
                    totalMCQs: mcqAnswers.length
                }
            })
        }
        
        // Check for alternating pattern (A, B, A, B...)
        let alternatingCount = 0
        for (let i = 1; i < mcqAnswers.length; i++) {
            if (Math.abs(mcqAnswers[i] - mcqAnswers[i - 1]) === 1) {
                alternatingCount++
            }
        }
        
        if (alternatingCount > mcqAnswers.length * 0.7) {
            flags.push({
                type: 'guess_pattern',
                severity: 'low',
                description: `Alternating answer pattern detected (possible guessing)`,
                evidence: {
                    alternatingRatio: alternatingCount / mcqAnswers.length
                }
            })
        }
    }
    
    return flags
}

/**
 * Detect identical responses across submissions
 */
function detectIdenticalResponses(
    submission: CandidateSubmission,
    allSubmissions: CandidateSubmission[],
    questions: Array<{ id: string; type: string }>
): BotDetectionResult['flags'] {
    const flags: BotDetectionResult['flags'] = []
    
    let identicalCount = 0
    
    for (const question of questions) {
        if (question.type === 'mcq') {
            const answer = submission.answers[question.id]
            const selected = answer?.response?.selected_option
            
            // Count how many other submissions have same answer
            const sameAnswerCount = allSubmissions.filter(s => {
                if (s.id === submission.id || s.assessmentId !== submission.assessmentId) return false
                const otherAnswer = s.answers[question.id]
                return otherAnswer?.response?.selected_option === selected
            }).length
            
            if (sameAnswerCount >= 5) {
                identicalCount++
            }
        }
    }
    
    if (identicalCount >= 3) {
        flags.push({
            type: 'identical_responses',
            severity: 'high',
            description: `Multiple identical responses detected across submissions`,
            evidence: {
                questionsWithIdenticalAnswers: identicalCount
            }
        })
    }
    
    return flags
}

/**
 * Main bot detection function
 */
export async function detectBotActivity(
    submission: CandidateSubmission,
    questions: Array<{ id: string; type: string; content?: any }>
): Promise<BotDetectionResult> {
    const allSubmissions = await getAllSubmissions()
    const flags: BotDetectionResult['flags'] = []
    
    // Run all detection methods
    flags.push(...detectRepeatedApplications(submission, allSubmissions))
    flags.push(...detectSuspiciousTiming(submission))
    flags.push(...detectGuessPatterns(submission, questions))
    flags.push(...detectIdenticalResponses(submission, allSubmissions, questions))
    
    // Calculate risk score
    let riskScore = 0
    flags.forEach(flag => {
        if (flag.severity === 'high') riskScore += 30
        else if (flag.severity === 'medium') riskScore += 15
        else riskScore += 5
    })
    
    riskScore = Math.min(100, riskScore)
    
    // Determine if bot
    const isBot = riskScore >= 50 || flags.some(f => f.severity === 'high')
    const confidence = Math.min(100, riskScore + (flags.length * 5))
    
    return {
        isBot,
        confidence,
        flags,
        riskScore
    }
}
