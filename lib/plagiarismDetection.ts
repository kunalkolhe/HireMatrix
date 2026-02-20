/**
 * Plagiarism Detection Service
 * Detects similarity between candidate answers and other submissions
 */

import { CandidateSubmission, getAllSubmissions } from './submissionService'

export interface PlagiarismResult {
    similarityScore: number // 0-100, higher = more similar
    isPlagiarized: boolean // true if similarity > threshold
    similarSubmissions: Array<{
        submissionId: string
        candidateName: string
        candidateEmail: string
        similarity: number
        matchedText?: string
    }>
    flagged: boolean
}

/**
 * Calculate text similarity using Levenshtein distance and word overlap
 */
function calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0
    
    // Normalize texts
    const normalize = (text: string) => 
        text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    
    const norm1 = normalize(text1)
    const norm2 = normalize(text2)
    
    if (norm1 === norm2) return 100
    
    // Word overlap similarity
    const words1 = new Set(norm1.split(' ').filter(w => w.length > 2))
    const words2 = new Set(norm2.split(' ').filter(w => w.length > 2))
    
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])
    
    const wordOverlap = union.size > 0 ? (intersection.size / union.size) * 100 : 0
    
    // Character-level similarity (Levenshtein-based)
    const maxLen = Math.max(norm1.length, norm2.length)
    if (maxLen === 0) return 0
    
    const distance = levenshteinDistance(norm1, norm2)
    const charSimilarity = ((maxLen - distance) / maxLen) * 100
    
    // Combined similarity (weighted)
    return Math.round((wordOverlap * 0.6) + (charSimilarity * 0.4))
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }
    
    return matrix[str2.length][str1.length]
}

/**
 * Extract code structure (normalize for comparison)
 */
function normalizeCode(code: string): string {
    return code
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/['"]/g, '"') // Normalize quotes
        .replace(/\d+/g, 'N') // Replace numbers with placeholder
        .trim()
}

/**
 * Calculate code similarity
 */
function calculateCodeSimilarity(code1: string, code2: string): number {
    if (!code1 || !code2) return 0
    
    const norm1 = normalizeCode(code1)
    const norm2 = normalizeCode(code2)
    
    if (norm1 === norm2) return 100
    
    // Token-based similarity
    const tokens1 = norm1.split(/\s+/).filter(t => t.length > 1)
    const tokens2 = norm2.split(/\s+/).filter(t => t.length > 1)
    
    const set1 = new Set(tokens1)
    const set2 = new Set(tokens2)
    
    const intersection = new Set([...set1].filter(t => set2.has(t)))
    const union = new Set([...set1, ...set2])
    
    const tokenSimilarity = union.size > 0 ? (intersection.size / union.size) * 100 : 0
    
    // Structure similarity (Levenshtein on normalized code)
    const maxLen = Math.max(norm1.length, norm2.length)
    if (maxLen === 0) return 0
    
    const distance = levenshteinDistance(norm1, norm2)
    const structureSimilarity = ((maxLen - distance) / maxLen) * 100
    
    // Combined
    return Math.round((tokenSimilarity * 0.5) + (structureSimilarity * 0.5))
}

/**
 * Detect plagiarism in subjective answers
 */
export async function detectSubjectivePlagiarism(
    submission: CandidateSubmission,
    questionId: string,
    threshold: number = 70
): Promise<PlagiarismResult> {
    const answer = submission.answers[questionId]
    const answerText = answer?.response?.text || ''
    
    if (!answerText || answerText.trim().length < 20) {
        return {
            similarityScore: 0,
            isPlagiarized: false,
            similarSubmissions: [],
            flagged: false
        }
    }
    
    const allSubmissions = await getAllSubmissions()
    const similarSubmissions: PlagiarismResult['similarSubmissions'] = []
    
    // Compare with other submissions for the same question
    for (const otherSubmission of allSubmissions) {
        // Skip same submission
        if (otherSubmission.id === submission.id) continue
        
        // Only check same assessment/question
        if (otherSubmission.assessmentId !== submission.assessmentId) continue
        
        const otherAnswer = otherSubmission.answers[questionId]
        const otherText = otherAnswer?.response?.text || ''
        
        if (!otherText || otherText.trim().length < 20) continue
        
        const similarity = calculateTextSimilarity(answerText, otherText)
        
        if (similarity >= threshold) {
            // Extract matched text snippet (first 100 chars)
            const matchedText = answerText.substring(0, 100) + '...'
            
            similarSubmissions.push({
                submissionId: otherSubmission.id,
                candidateName: otherSubmission.candidateInfo.name,
                candidateEmail: otherSubmission.candidateInfo.email,
                similarity,
                matchedText
            })
        }
    }
    
    // Sort by similarity (highest first)
    similarSubmissions.sort((a, b) => b.similarity - a.similarity)
    
    const maxSimilarity = similarSubmissions.length > 0 
        ? similarSubmissions[0].similarity 
        : 0
    
    return {
        similarityScore: maxSimilarity,
        isPlagiarized: maxSimilarity >= threshold,
        similarSubmissions: similarSubmissions.slice(0, 5), // Top 5 matches
        flagged: maxSimilarity >= threshold
    }
}

/**
 * Detect code similarity in coding questions
 */
export async function detectCodeSimilarity(
    submission: CandidateSubmission,
    questionId: string,
    threshold: number = 80
): Promise<PlagiarismResult> {
    const answer = submission.answers[questionId]
    const code = answer?.response?.code || ''
    
    if (!code || code.trim().length < 30) {
        return {
            similarityScore: 0,
            isPlagiarized: false,
            similarSubmissions: [],
            flagged: false
        }
    }
    
    const allSubmissions = await getAllSubmissions()
    const similarSubmissions: PlagiarismResult['similarSubmissions'] = []
    
    // Compare with other submissions for the same question
    for (const otherSubmission of allSubmissions) {
        // Skip same submission
        if (otherSubmission.id === submission.id) continue
        
        // Only check same assessment/question
        if (otherSubmission.assessmentId !== submission.assessmentId) continue
        
        const otherAnswer = otherSubmission.answers[questionId]
        const otherCode = otherAnswer?.response?.code || ''
        
        if (!otherCode || otherCode.trim().length < 30) continue
        
        const similarity = calculateCodeSimilarity(code, otherCode)
        
        if (similarity >= threshold) {
            // Extract code snippet (first 150 chars)
            const matchedText = code.substring(0, 150) + '...'
            
            similarSubmissions.push({
                submissionId: otherSubmission.id,
                candidateName: otherSubmission.candidateInfo.name,
                candidateEmail: otherSubmission.candidateInfo.email,
                similarity,
                matchedText
            })
        }
    }
    
    // Sort by similarity
    similarSubmissions.sort((a, b) => b.similarity - a.similarity)
    
    const maxSimilarity = similarSubmissions.length > 0 
        ? similarSubmissions[0].similarity 
        : 0
    
    return {
        similarityScore: maxSimilarity,
        isPlagiarized: maxSimilarity >= threshold,
        similarSubmissions: similarSubmissions.slice(0, 5), // Top 5 matches
        flagged: maxSimilarity >= threshold
    }
}

/**
 * Check all answers in a submission for plagiarism
 */
export async function checkSubmissionPlagiarism(
    submission: CandidateSubmission,
    questions: Array<{ id: string; type: string }>
): Promise<Record<string, PlagiarismResult>> {
    const results: Record<string, PlagiarismResult> = {}
    
    for (const question of questions) {
        if (question.type === 'subjective') {
            results[question.id] = await detectSubjectivePlagiarism(submission, question.id)
        } else if (question.type === 'coding') {
            results[question.id] = await detectCodeSimilarity(submission, question.id)
        }
    }
    
    return results
}
