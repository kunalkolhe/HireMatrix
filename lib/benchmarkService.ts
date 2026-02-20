/**
 * Benchmark Comparison Service
 * Compares candidate performance against top performers
 */

import { CandidateSubmission, getAllSubmissions } from './submissionService'

export interface BenchmarkComparison {
    candidateScore: number
    candidatePercentage: number
    benchmarkStats: {
        average: number
        median: number
        top10Percent: number
        top25Percent: number
        percentile: number // Candidate's percentile rank
    }
    skillComparison: Array<{
        skill: string
        candidateScore: number
        benchmarkAverage: number
        benchmarkTop10: number
        percentile: number
        status: 'above_average' | 'average' | 'below_average'
    }>
    overallStatus: 'top_performer' | 'above_average' | 'average' | 'below_average'
    recommendations: string[]
}

/**
 * Calculate percentile rank
 */
function calculatePercentile(value: number, values: number[]): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const rank = sorted.filter(v => v <= value).length
    return Math.round((rank / sorted.length) * 100)
}

/**
 * Get benchmark comparison for a candidate
 */
export function getBenchmarkComparison(
    submission: CandidateSubmission,
    assessmentId?: string
): BenchmarkComparison {
    const allSubmissions = getAllSubmissions()
    
    // Filter submissions for same assessment (or all if not specified)
    const relevantSubmissions = assessmentId
        ? allSubmissions.filter(s => s.assessmentId === assessmentId && s.scores)
        : allSubmissions.filter(s => s.scores)
    
    if (relevantSubmissions.length === 0) {
        return {
            candidateScore: submission.scores?.totalScore || 0,
            candidatePercentage: submission.scores?.percentage || 0,
            benchmarkStats: {
                average: 0,
                median: 0,
                top10Percent: 0,
                top25Percent: 0,
                percentile: 0
            },
            skillComparison: [],
            overallStatus: 'average',
            recommendations: ['Insufficient data for benchmark comparison']
        }
    }
    
    // Extract all scores
    const allScores = relevantSubmissions
        .map(s => s.scores?.percentage || 0)
        .filter(s => s > 0)
    
    const candidateScore = submission.scores?.totalScore || 0
    const candidatePercentage = submission.scores?.percentage || 0
    
    // Calculate benchmark statistics
    const sortedScores = [...allScores].sort((a, b) => b - a)
    const average = allScores.reduce((a, b) => a + b, 0) / allScores.length
    const median = sortedScores[Math.floor(sortedScores.length / 2)]
    const top10Index = Math.floor(sortedScores.length * 0.1)
    const top25Index = Math.floor(sortedScores.length * 0.25)
    const top10Percent = sortedScores[top10Index] || sortedScores[0] || 0
    const top25Percent = sortedScores[top25Index] || sortedScores[0] || 0
    const percentile = calculatePercentile(candidatePercentage, allScores)
    
    // Skill comparison
    const skillComparison: BenchmarkComparison['skillComparison'] = []
    
    if (submission.scores?.skillScores) {
        // Collect all skill scores from other submissions
        const skillDataMap: Record<string, number[]> = {}
        
        relevantSubmissions.forEach(s => {
            if (s.scores?.skillScores) {
                Object.entries(s.scores.skillScores).forEach(([skill, data]) => {
                    if (!skillDataMap[skill]) {
                        skillDataMap[skill] = []
                    }
                    skillDataMap[skill].push(data.percentage)
                })
            }
        })
        
        // Compare candidate's skills
        Object.entries(submission.scores.skillScores).forEach(([skill, data]) => {
            const skillScores = skillDataMap[skill] || []
            
            if (skillScores.length > 0) {
                const sorted = [...skillScores].sort((a, b) => b - a)
                const avg = skillScores.reduce((a, b) => a + b, 0) / skillScores.length
                const top10Idx = Math.floor(sorted.length * 0.1)
                const top10 = sorted[top10Idx] || sorted[0] || 0
                const skillPercentile = calculatePercentile(data.percentage, skillScores)
                
                let status: 'above_average' | 'average' | 'below_average'
                if (data.percentage >= avg * 1.1) status = 'above_average'
                else if (data.percentage >= avg * 0.9) status = 'average'
                else status = 'below_average'
                
                skillComparison.push({
                    skill,
                    candidateScore: data.percentage,
                    benchmarkAverage: Math.round(avg),
                    benchmarkTop10: Math.round(top10),
                    percentile: skillPercentile,
                    status
                })
            }
        })
        
        skillComparison.sort((a, b) => b.percentile - a.percentile)
    }
    
    // Determine overall status
    let overallStatus: BenchmarkComparison['overallStatus']
    if (percentile >= 90) overallStatus = 'top_performer'
    else if (percentile >= 60) overallStatus = 'above_average'
    else if (percentile >= 40) overallStatus = 'average'
    else overallStatus = 'below_average'
    
    // Generate recommendations
    const recommendations: string[] = []
    
    if (percentile >= 90) {
        recommendations.push('Excellent performance! You rank in the top 10% of candidates.')
    } else if (percentile >= 75) {
        recommendations.push('Strong performance. You rank above 75% of candidates.')
    } else if (percentile < 50) {
        recommendations.push('Performance is below average. Focus on improving core skills.')
    }
    
    // Skill-specific recommendations
    const weakSkills = skillComparison.filter(s => s.status === 'below_average')
    if (weakSkills.length > 0) {
        recommendations.push(
            `Focus on improving: ${weakSkills.slice(0, 3).map(s => s.skill).join(', ')}`
        )
    }
    
    const strongSkills = skillComparison.filter(s => s.status === 'above_average')
    if (strongSkills.length > 0) {
        recommendations.push(
            `Your strengths: ${strongSkills.slice(0, 3).map(s => s.skill).join(', ')}`
        )
    }
    
    return {
        candidateScore,
        candidatePercentage,
        benchmarkStats: {
            average: Math.round(average),
            median: Math.round(median),
            top10Percent: Math.round(top10Percent),
            top25Percent: Math.round(top25Percent),
            percentile
        },
        skillComparison,
        overallStatus,
        recommendations
    }
}
