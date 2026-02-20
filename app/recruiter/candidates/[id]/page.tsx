"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Brain,
    ArrowLeft,
    User,
    Mail,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Download,
    Clock,
    FileText,
    Code,
    MessageSquare,
    TrendingUp,
    Shield,
    Briefcase
} from "lucide-react"
import { getSubmissionById, updateSubmissionStatus } from "@/lib/submissionService"
import { CandidateSubmission } from "@/lib/submissionService"
import { toast } from "sonner"
import { ChevronDown, ChevronUp } from "lucide-react"
import { getBenchmarkComparison } from "@/lib/benchmarkService"

interface SkillScore {
    skill: string
    score: number
    maxScore: number
    percentage: number
}

interface CandidateReport {
    id: string
    name: string
    email: string
    jobTitle: string
    company: string
    submittedAt: string
    timeSpent: number
    status: 'pending' | 'evaluated' | 'shortlisted' | 'rejected'
    // Scores
    totalScore: number
    totalPossible: number
    percentage: number
    passed: boolean
    // Section breakdown
    sections: {
        mcq: { score: number; total: number; correct: number; totalQuestions: number }
        subjective: { score: number; total: number }
        coding: { score: number; total: number }
    }
    // Skill breakdown
    skillScores: SkillScore[]
    // Resume skills (claimed)
    resumeSkills: string[]
    // Anti-cheat
    tabSwitches: number
    pasteCount: number
    // AI insights
    aiInsights: string[]
    // Mismatch warnings
    skillMismatches: {
        skill: string
        claimed: string
        actual: string
        warning: string
    }[]
}

export default function CandidateReportPage() {
    const params = useParams()
    const router = useRouter()
    const candidateId = params.id as string

    const [report, setReport] = useState<CandidateReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [submission, setSubmission] = useState<CandidateSubmission | null>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [showAnswers, setShowAnswers] = useState(false)
    const [fullResumeData, setFullResumeData] = useState<any>(null)

    useEffect(() => {
        const loadSubmission = async () => {
            // Decode the candidate ID (in case it was URL encoded)
            const decodedId = decodeURIComponent(candidateId)

            // Load real submission data (now async)
            let submission = await getSubmissionById(decodedId)

            // If still not found, try the original ID
            if (!submission) {
                submission = await getSubmissionById(candidateId)
            }

            if (!submission) {
                console.error('Submission not found for ID:', candidateId, 'or decoded:', decodedId)
                try {
                    const { getAllSubmissions } = await import('@/lib/submissionService')
                    const allSubmissions = await getAllSubmissions()
                    console.log('Available submissions:', allSubmissions.map((s: any) => ({
                        id: s.id,
                        name: s.candidateInfo?.name || 'Unknown',
                        email: s.candidateInfo?.email || 'No email'
                    })))
                } catch (e) {
                    console.error('Error loading submissions:', e)
                }
                setLoading(false)
                return
            }

            // Store submission for answers display
            setSubmission(submission)

            // Load full resume data from resume_data table if candidate has one
            if (submission.candidateInfo?.userId) {
                try {
                    const { getResumeData } = await import('@/lib/resumeService')
                    const resumeData = await getResumeData(submission.candidateInfo.userId)
                    if (resumeData) {
                        setFullResumeData({
                            skills: resumeData.skills || [],
                            personalInfo: resumeData.personal_info || {},
                            experience: resumeData.experience || [],
                            education: resumeData.education || [],
                            summary: resumeData.summary || '',
                            achievements: resumeData.achievements || [],
                            certifications: resumeData.certifications || [],
                            languages: resumeData.languages || [],
                            projects: resumeData.projects || [],
                            atsScore: resumeData.ats_score || 0,
                            updatedAt: resumeData.updated_at
                        })
                    }
                } catch (error) {
                    console.error('Error loading full resume data:', error)
                }
            }

            // Load questions from job (try Supabase first, fallback to localStorage)
            try {
                const { getJobById } = await import('@/lib/jobService')
                const job = await getJobById(submission.jobId)
                if (job?.questions) {
                    setQuestions(job.questions)
                } else {
                    // Fallback to localStorage
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const localJob = savedJobs.find((j: any) => j.id === submission.jobId)
                    if (localJob?.questions) {
                        setQuestions(localJob.questions)
                    }
                }
            } catch (e) {
                // Fallback to localStorage
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const job = savedJobs.find((j: any) => j.id === submission.jobId)
                if (job?.questions) {
                    setQuestions(job.questions)
                }
            }

            // Calculate time spent with safe defaults
            const startedAt = submission.candidateInfo?.startedAt
                ? new Date(submission.candidateInfo.startedAt)
                : new Date(submission.submittedAt || new Date().toISOString())
            const submittedAt = new Date(submission.submittedAt || new Date().toISOString())
            const timeSpent = Math.round((submittedAt.getTime() - startedAt.getTime()) / 60000) // minutes

            // Get passing percentage from job/assessment
            let passingPercentage = 50 // default
            try {
                const { getJobById } = await import('@/lib/jobService')
                const job = await getJobById(submission.jobId)
                if (job?.assessment?.passing_percentage !== undefined) {
                    passingPercentage = job.assessment.passing_percentage
                } else if ((job as any)?.config?.passing_percentage !== undefined) {
                    passingPercentage = (job as any).config.passing_percentage
                }
            } catch (e) {
                console.warn('Could not fetch passing percentage, using default 50%')
            }

            // Determine if candidate passed:
            // 1. If status is 'shortlisted', they definitely passed
            // 2. Otherwise, check percentage against passing threshold
            const candidatePercentage = submission.scores?.percentage || 0
            const isShortlisted = submission.status === 'shortlisted'
            const passedByPercentage = candidatePercentage >= passingPercentage
            const passed = isShortlisted || passedByPercentage

            // Convert submission to report format
            const report: CandidateReport = {
                id: submission.id,
                name: submission.candidateInfo?.name || 'Unknown Candidate',
                email: submission.candidateInfo?.email || 'No email provided',
                jobTitle: submission.jobTitle || 'Unknown Job',
                company: submission.company || 'Unknown Company',
                submittedAt: submission.submittedAt || new Date().toISOString(),
                timeSpent: timeSpent || 0,
                status: submission.status || 'pending',
                totalScore: submission.scores?.totalScore || 0,
                totalPossible: submission.scores?.totalPossible || 0,
                percentage: candidatePercentage,
                passed: passed,
                sections: {
                    mcq: submission.scores?.sectionScores?.mcq || { score: 0, total: 0, correct: 0, totalQuestions: 0 },
                    subjective: submission.scores?.sectionScores?.subjective || { score: 0, total: 0 },
                    coding: submission.scores?.sectionScores?.coding || { score: 0, total: 0 }
                },
                skillScores: submission.scores?.skillScores
                    ? Object.entries(submission.scores.skillScores).map(([skill, data]: [string, any]) => ({
                        skill,
                        score: data.score,
                        maxScore: data.total,
                        percentage: data.percentage
                    }))
                    : [],
                resumeSkills: fullResumeData?.skills || submission.resumeData?.skills || [],
                tabSwitches: submission.antiCheatData?.tab_switches || 0,
                pasteCount: submission.antiCheatData?.copy_paste_detected ? 1 : 0,
                aiInsights: generateAIInsights(submission),
                skillMismatches: generateSkillMismatches(submission)
            }

            setReport(report)
            setLoading(false)
        }

        loadSubmission()
    }, [candidateId])

    const generateAIInsights = (submission: CandidateSubmission): string[] => {
        const insights: string[] = []

        if (submission.scores) {
            if (submission.scores.percentage >= 80) {
                insights.push("Excellent overall performance with strong technical knowledge.")
            } else if (submission.scores.percentage >= 60) {
                insights.push("Good performance with solid understanding of core concepts.")
            } else {
                insights.push("Performance indicates need for improvement in key areas.")
            }

            // Section-specific insights
            const mcqPercent = submission.scores.sectionScores.mcq.total > 0
                ? (submission.scores.sectionScores.mcq.score / submission.scores.sectionScores.mcq.total) * 100
                : 0
            if (mcqPercent >= 80) {
                insights.push("Strong performance in multiple choice questions.")
            }

            const codingPercent = submission.scores.sectionScores.coding.total > 0
                ? (submission.scores.sectionScores.coding.score / submission.scores.sectionScores.coding.total) * 100
                : 0
            if (codingPercent >= 70) {
                insights.push("Good problem-solving and coding skills demonstrated.")
            }
        }

        // Anti-cheat insights
        if (submission.antiCheatData.tab_switches > 3) {
            insights.push("Multiple tab switches detected during assessment.")
        }

        return insights.length > 0 ? insights : ["Assessment completed successfully."]
    }

    const generateSkillMismatches = (submission: CandidateSubmission) => {
        const mismatches: CandidateReport['skillMismatches'] = []

        // Use fullResumeData if available, otherwise fallback to submission resumeData
        const resumeSkillsList = fullResumeData?.skills || submission.resumeData?.skills || []

        if (resumeSkillsList.length > 0 && submission.scores?.skillScores) {
            const resumeSkills = resumeSkillsList.map((s: string) => s.toLowerCase())

            Object.entries(submission.scores.skillScores).forEach(([skill, data]) => {
                const skillLower = skill.toLowerCase()
                const claimedInResume = resumeSkills.some((rs: string) => rs.includes(skillLower))

                if (claimedInResume && data.percentage < 50) {
                    mismatches.push({
                        skill,
                        claimed: "Listed in resume",
                        actual: data.percentage < 30 ? "Below Expected" : "Needs Improvement",
                        warning: `${skill} performance (${data.percentage}%) was lower than expected based on resume.`
                    })
                }
            })
        }

        return mismatches
    }

    const handleStatusChange = async (newStatus: 'shortlisted' | 'rejected') => {
        const updated = await updateSubmissionStatus(candidateId, newStatus)
        if (updated) {
            toast.success(`Candidate ${newStatus === 'shortlisted' ? 'shortlisted' : 'rejected'}`)
            // Reload data
            const submission = await getSubmissionById(candidateId)
            if (submission) {
                const startedAt = new Date(submission.candidateInfo?.startedAt || submission.submittedAt)
                const submittedAt = new Date(submission.submittedAt)
                const timeSpent = Math.round((submittedAt.getTime() - startedAt.getTime()) / 60000)

                // Get passing percentage
                let passingPercentage = 50
                try {
                    const { getJobById } = await import('@/lib/jobService')
                    const job = await getJobById(submission.jobId)
                    if (job?.assessment?.passing_percentage !== undefined) {
                        passingPercentage = job.assessment.passing_percentage
                    } else if ((job as any)?.config?.passing_percentage !== undefined) {
                        passingPercentage = (job as any).config.passing_percentage
                    }
                } catch (e) {
                    console.warn('Could not fetch passing percentage')
                }

                // Update passed status based on new status
                const candidatePercentage = submission.scores?.percentage || 0
                const isShortlisted = newStatus === 'shortlisted'
                const passedByPercentage = candidatePercentage >= passingPercentage
                const passed = isShortlisted || passedByPercentage

                const updatedReport: CandidateReport = {
                    ...report!,
                    status: newStatus,
                    passed: passed,
                    timeSpent
                }
                setReport(updatedReport)
            }
        }
    }

    const handleDownloadReport = () => {
        if (!submission || !questions) {
            toast.error('Unable to generate report: Missing data')
            return
        }

        try {
            const { downloadPDFReport } = require('@/lib/pdfReportGenerator')
            downloadPDFReport(submission, questions, {
                includeAnswers: true,
                includeBenchmark: false
            })
            toast.success('PDF report opened in new window. Use browser print to save as PDF.')
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error('Failed to generate PDF report')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!report) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-white/50">Candidate not found</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-white/50 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Candidates
                </Button>
                <div className="flex gap-2">
                    {report && (report.status === 'pending' || report.status === 'evaluated') && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleStatusChange('shortlisted')}
                                className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Shortlist
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleStatusChange('rejected')}
                                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={handleDownloadReport}
                        className="bg-white text-black hover:bg-white/90"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF Report
                    </Button>
                </div>
            </div>

            {/* Candidate Header Card */}
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold text-3xl">
                                {report.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{report.name}</h1>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-white/60">
                                        <Mail className="w-4 h-4" />
                                        <span>{report.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/60">
                                        <Briefcase className="w-4 h-4" />
                                        <span>{report.jobTitle} at {report.company}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-white/50 font-medium uppercase tracking-wider">Overall Score</span>
                                <div className={`text-5xl font-bold ${report.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {report.percentage}%
                                </div>
                            </div>
                            <Badge className={`px-3 py-1 text-sm ${report.passed
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}>
                                {report.passed ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                                {report.passed ? 'Qualified' : 'Not Qualified'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/10">
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Time Taken</p>
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Clock className="w-4 h-4 text-blue-400" />
                                {report.timeSpent} mins
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Anti-Cheat Flags</p>
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Shield className="w-4 h-4 text-amber-400" />
                                {report.tabSwitches + report.pasteCount} warnings
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Submitted On</p>
                            <div className="text-white/70 font-medium">
                                {new Date(report.submittedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Status</p>
                            <Badge className={`px-2 py-1 text-xs ${report.status === 'shortlisted' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                    report.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        report.status === 'evaluated' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}>
                                {report.status}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Section Scores Breakdown */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white px-2">Performance Breakdown</h3>

                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">MCQs</p>
                                        <p className="text-xs text-white/50">Multiple Choice</p>
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-blue-400">
                                    {report.sections.mcq.total > 0 ? Math.round((report.sections.mcq.score / report.sections.mcq.total) * 100) : 0}%
                                </span>
                            </div>
                            <Progress value={report.sections.mcq.total > 0 ? (report.sections.mcq.score / report.sections.mcq.total) * 100 : 0} className="h-2" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">Subjective</p>
                                        <p className="text-xs text-white/50">Written Responses</p>
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-amber-400">
                                    {report.sections.subjective.total > 0 ? Math.round((report.sections.subjective.score / report.sections.subjective.total) * 100) : 0}%
                                </span>
                            </div>
                            <Progress value={report.sections.subjective.total > 0 ? (report.sections.subjective.score / report.sections.subjective.total) * 100 : 0} className="h-2" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                        <Code className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">Coding</p>
                                        <p className="text-xs text-white/50">Programming Problems</p>
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-emerald-400">
                                    {report.sections.coding.total > 0 ? Math.round((report.sections.coding.score / report.sections.coding.total) * 100) : 0}%
                                </span>
                            </div>
                            <Progress value={report.sections.coding.total > 0 ? (report.sections.coding.score / report.sections.coding.total) * 100 : 0} className="h-2" />
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <h3 className="text-lg font-semibold text-white px-2">Detailed Analysis</h3>

                    {/* Skill Performance */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                Skill Proficiency
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {report.skillScores.length > 0 ? (
                                report.skillScores.map((skill, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-white/70 font-medium">{skill.skill}</span>
                                            <span className={`font-bold ${skill.percentage >= 70 ? 'text-emerald-400' :
                                                skill.percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                                                }`}>
                                                {skill.percentage}%
                                            </span>
                                        </div>
                                        <Progress value={skill.percentage} className="h-2.5" />
                                    </div>
                                ))
                            ) : (
                                <p className="text-white/50 text-sm">No skill scores available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Benchmark Comparison */}
                    {submission && submission.scores && (() => {
                        try {
                            const benchmark = getBenchmarkComparison(submission, submission.assessmentId)
                            return (
                                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30 mb-6">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <TrendingUp className="w-5 h-5 text-blue-400" />
                                            Benchmark Comparison
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/50 mb-1">Your Score</div>
                                                <div className="text-2xl font-bold text-white">{benchmark.candidatePercentage}%</div>
                                            </div>
                                            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/50 mb-1">Average</div>
                                                <div className="text-2xl font-bold text-blue-400">{benchmark.benchmarkStats.average}%</div>
                                            </div>
                                            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/50 mb-1">Top 10%</div>
                                                <div className="text-2xl font-bold text-emerald-400">{benchmark.benchmarkStats.top10Percent}%</div>
                                            </div>
                                            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/50 mb-1">Percentile</div>
                                                <div className="text-2xl font-bold text-purple-400">{benchmark.benchmarkStats.percentile}th</div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="text-sm font-semibold text-white/70 mb-2">Status:
                                                <span className={`ml-2 ${benchmark.overallStatus === 'top_performer' ? 'text-emerald-400' :
                                                        benchmark.overallStatus === 'above_average' ? 'text-blue-400' :
                                                            benchmark.overallStatus === 'average' ? 'text-amber-400' :
                                                                'text-red-400'
                                                    }`}>
                                                    {benchmark.overallStatus.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            {benchmark.recommendations.length > 0 && (
                                                <ul className="list-disc list-inside text-sm text-white/60 space-y-1">
                                                    {benchmark.recommendations.map((rec, idx) => (
                                                        <li key={idx}>{rec}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        } catch (error) {
                            return null
                        }
                    })()}

                    {/* Plagiarism & Bot Detection Warnings */}
                    {(submission?.plagiarismData?.flagged || submission?.botDetectionData?.isBot) && (
                        <Card className="bg-red-500/10 border-red-500/30 mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    Security Flags
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {submission.plagiarismData?.flagged && (
                                    <div className="p-3 bg-white/5 rounded border border-red-500/30">
                                        <div className="font-semibold text-red-400 mb-1">⚠️ Plagiarism Detected</div>
                                        <div className="text-sm text-red-300">
                                            Similar content found in other submissions. Review candidate answers carefully.
                                        </div>
                                    </div>
                                )}
                                {submission.botDetectionData?.isBot && (
                                    <div className="p-3 bg-white/5 rounded border border-red-500/30">
                                        <div className="font-semibold text-red-400 mb-1">🤖 Bot Activity Detected</div>
                                        <div className="text-sm text-red-300 mb-2">
                                            Risk Score: {submission.botDetectionData.riskScore}% |
                                            Confidence: {submission.botDetectionData.confidence}%
                                        </div>
                                        {submission.botDetectionData.flags && submission.botDetectionData.flags.length > 0 && (
                                            <ul className="text-xs text-red-300 list-disc list-inside">
                                                {submission.botDetectionData.flags.slice(0, 3).map((flag: any, idx: number) => (
                                                    <li key={idx}>{flag.description}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Mismatches */}
                        {report.skillMismatches.length > 0 && (
                            <Card className="bg-amber-500/10 border-amber-500/30">
                                <CardHeader>
                                    <CardTitle className="text-amber-400 flex items-center gap-2 text-base">
                                        <AlertTriangle className="w-5 h-5" />
                                        Resume Gap Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {report.skillMismatches.map((mismatch, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-lg p-4 border border-amber-500/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                                    {mismatch.skill}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-white/60 grid grid-cols-2 gap-2 mb-2">
                                                <span>Claimed: <span className="text-white font-medium">{mismatch.claimed}</span></span>
                                                <span>Actual: <span className="text-white font-medium">{mismatch.actual}</span></span>
                                            </div>
                                            <p className="text-sm text-amber-300 leading-relaxed">"{mismatch.warning}"</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Insights */}
                        <Card className="bg-blue-500/10 border-blue-500/30">
                            <CardHeader>
                                <CardTitle className="text-blue-400 flex items-center gap-2 text-base">
                                    <Brain className="w-5 h-5" />
                                    AI Observations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {report.aiInsights.map((insight, idx) => (
                                    <div key={idx} className="flex gap-3 text-sm text-white/70 leading-relaxed bg-white/5 p-3 rounded-lg border border-blue-500/30">
                                        <SparklesIcon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                        <span>{insight}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Resume Information Section */}
            {fullResumeData && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            Candidate Resume Information
                        </CardTitle>
                        <CardDescription className="text-white/50">
                            Resume data extracted and confirmed by candidate
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Skills */}
                        {fullResumeData.skills && fullResumeData.skills.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-3">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {fullResumeData.skills.map((skill: string, idx: number) => (
                                        <Badge key={idx} variant="secondary" className="text-sm bg-white/10 text-white/70 border-white/20">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Experience */}
                        {fullResumeData.experience && fullResumeData.experience.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-3">Work Experience</h4>
                                <div className="space-y-3">
                                    {fullResumeData.experience.map((exp: any, idx: number) => (
                                        <div key={idx} className="border-l-2 border-blue-400 pl-4 py-2">
                                            <div className="font-medium text-white">{exp.position || 'Position'}</div>
                                            <div className="text-sm text-white/60">{exp.company || 'Company'}</div>
                                            <div className="text-xs text-white/50">{exp.duration || 'Duration'}</div>
                                            {exp.description && (
                                                <div className="text-sm text-white/70 mt-2">{exp.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Education */}
                        {fullResumeData.education && fullResumeData.education.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-3">Education</h4>
                                <div className="space-y-2">
                                    {fullResumeData.education.map((edu: any, idx: number) => (
                                        <div key={idx} className="text-sm">
                                            <div className="font-medium text-white">{edu.degree || 'Degree'}</div>
                                            <div className="text-white/60">{edu.institution || 'Institution'}</div>
                                            {edu.field && <div className="text-white/50">{edu.field}</div>}
                                            {edu.year && <div className="text-white/50">{edu.year}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        {fullResumeData.summary && (
                            <div>
                                <h4 className="font-semibold text-white mb-3">Professional Summary</h4>
                                <p className="text-sm text-white/70 leading-relaxed">{fullResumeData.summary}</p>
                            </div>
                        )}

                        {/* Achievements */}
                        {fullResumeData.achievements && fullResumeData.achievements.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-3">Achievements</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-white/70">
                                    {fullResumeData.achievements.map((achievement: string, idx: number) => (
                                        <li key={idx}>{achievement}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Certifications */}
                        {fullResumeData.certifications && fullResumeData.certifications.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-3">Certifications</h4>
                                <div className="flex flex-wrap gap-2">
                                    {fullResumeData.certifications.map((cert: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-sm border-white/20 text-white/70">
                                            {cert}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ATS Score */}
                        {fullResumeData.atsScore > 0 && (
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white/70">Resume ATS Score</span>
                                    <Badge className={fullResumeData.atsScore >= 70 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : fullResumeData.atsScore >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                                        {fullResumeData.atsScore}/100
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actual Answers Section */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            Candidate's Actual Responses
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAnswers(!showAnswers)}
                            className="border-white/10 text-white hover:bg-white/10"
                        >
                            {showAnswers ? 'Hide' : 'Show'} Answers
                        </Button>
                    </div>
                    <CardDescription className="text-white/50">
                        View the actual answers submitted by the candidate
                    </CardDescription>
                </CardHeader>
                {showAnswers && submission && questions.length > 0 && (
                    <CardContent className="space-y-6">
                        {/* MCQ Answers */}
                        {questions.filter((q: any) => q.type === 'mcq').length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    Multiple Choice Questions
                                </h4>
                                <div className="space-y-4">
                                    {questions.filter((q: any) => q.type === 'mcq').map((question: any, idx: number) => {
                                        const answer = submission.answers[question.id]
                                        const selectedOption = answer?.response?.selected_option
                                        const isCorrect = selectedOption === question.content.correct_answer
                                        const candidateAnswer = selectedOption !== null && selectedOption !== undefined
                                            ? question.content.options[selectedOption]
                                            : 'Not answered'
                                        const correctAnswer = question.content.options[question.content.correct_answer]

                                        return (
                                            <div key={question.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-medium text-white">Q{idx + 1}:</span>
                                                            <span className="text-white/70">{question.content.question}</span>
                                                        </div>
                                                        <div className="space-y-2 ml-6">
                                                            {question.content.options.map((option: string, optIdx: number) => (
                                                                <div
                                                                    key={optIdx}
                                                                    className={`p-2 rounded ${optIdx === selectedOption
                                                                            ? isCorrect
                                                                                ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                                                                : 'bg-red-500/20 border-2 border-red-500'
                                                                            : optIdx === question.content.correct_answer
                                                                                ? 'bg-blue-500/20 border border-blue-500/50'
                                                                                : 'bg-white/5 border border-white/10'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-medium ${optIdx === selectedOption
                                                                                ? isCorrect ? 'text-emerald-400' : 'text-red-400'
                                                                                : optIdx === question.content.correct_answer
                                                                                    ? 'text-blue-400' : 'text-white/70'
                                                                            }`}>
                                                                            {String.fromCharCode(65 + optIdx)}.
                                                                        </span>
                                                                        <span className={optIdx === selectedOption ? 'font-semibold text-white' : 'text-white/70'}>
                                                                            {option}
                                                                        </span>
                                                                        {optIdx === selectedOption && (
                                                                            <Badge className={isCorrect ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50' : 'bg-red-500/30 text-red-400 border-red-500/50'}>
                                                                                Candidate's Answer
                                                                            </Badge>
                                                                        )}
                                                                        {optIdx === question.content.correct_answer && optIdx !== selectedOption && (
                                                                            <Badge className="bg-blue-500/30 text-blue-400 border-blue-500/50">Correct Answer</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        {isCorrect ? (
                                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Correct
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Incorrect
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-3 text-sm text-white/60 ml-6">
                                                    <p><strong className="text-white/70">Candidate selected:</strong> {candidateAnswer}</p>
                                                    {!isCorrect && (
                                                        <p><strong className="text-white/70">Correct answer:</strong> {correctAnswer}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Subjective Answers */}
                        {questions.filter((q: any) => q.type === 'subjective').length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-amber-400" />
                                    Subjective Questions
                                </h4>
                                <div className="space-y-4">
                                    {questions.filter((q: any) => q.type === 'subjective').map((question: any, idx: number) => {
                                        const answer = submission.answers[question.id]
                                        const answerText = answer?.response?.text || 'Not answered'

                                        return (
                                            <div key={question.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                                                <div className="mb-2">
                                                    <span className="font-medium text-white">Q{idx + 1}:</span>
                                                    <span className="text-white/70 ml-2">{question.content.question}</span>
                                                </div>
                                                <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
                                                    <p className="text-white/70 whitespace-pre-wrap">{answerText}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Coding Answers */}
                        {questions.filter((q: any) => q.type === 'coding').length > 0 && (
                            <div>
                                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <Code className="w-4 h-4 text-emerald-400" />
                                    Coding Questions
                                </h4>
                                <div className="space-y-4">
                                    {questions.filter((q: any) => q.type === 'coding').map((question: any, idx: number) => {
                                        const answer = submission.answers[question.id]
                                        const code = answer?.response?.code || 'No code submitted'
                                        const language = answer?.response?.language || 'unknown'

                                        return (
                                            <div key={question.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                                                <div className="mb-2">
                                                    <span className="font-medium text-white">Q{idx + 1}:</span>
                                                    <span className="text-white/70 ml-2">{question.content.problem_statement}</span>
                                                </div>
                                                <div className="mt-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm text-white/60">Language: {language}</span>
                                                    </div>
                                                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                                                        <code>{code}</code>
                                                    </pre>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    )
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}
