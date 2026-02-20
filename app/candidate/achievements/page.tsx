"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, Download, Trophy, CheckCircle, Clock, XCircle, Briefcase, Building, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getSubmissionsByCandidate } from "@/lib/submissionService"
import { generatePDFReportHTML, downloadPDFReport } from "@/lib/pdfReportGenerator"
import { toast } from "sonner"

interface Submission {
    id: string
    jobId: string
    jobTitle: string
    company: string
    status: 'pending' | 'submitted' | 'evaluated' | 'shortlisted' | 'rejected'
    scores?: {
        percentage?: number
        mcq?: number
        subjective?: number
        coding?: number
    }
    submittedAt?: string
    evaluatedAt?: string
}

export default function AchievementsPage() {
    const { user } = useAuth()
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'evaluated' | 'pending'>('all')

    useEffect(() => {
        const loadSubmissions = async () => {
            if (!user?.id && !user?.email) {
                setLoading(false)
                return
            }

            try {
                const data = await getSubmissionsByCandidate(user?.id, user?.email)
                setSubmissions(data || [])
            } catch (error) {
                console.error('Error loading submissions:', error)
                setSubmissions([])
            } finally {
                setLoading(false)
            }
        }

        loadSubmissions()
    }, [user])

    const handleDownloadReport = async (submission: Submission) => {
        setDownloadingId(submission.id)
        try {
            // TODO: Fetch actual questions for the report if needed
            // For now, we pass empty questions and disable answer inclusion to fix the build
            downloadPDFReport(submission as any, [], { includeAnswers: false })
            toast.success('Report downloaded successfully!')
        } catch (error) {
            console.error('Error downloading report:', error)
            toast.error('Failed to download report. Please try again.')
        } finally {
            setDownloadingId(null)
        }
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'shortlisted':
                return { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Trophy, label: 'Shortlisted' }
            case 'evaluated':
                return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle, label: 'Evaluated' }
            case 'rejected':
                return { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle, label: 'Rejected' }
            case 'submitted':
                return { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock, label: 'Submitted' }
            default:
                return { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Clock, label: 'Pending' }
        }
    }

    const filteredSubmissions = submissions.filter(sub => {
        if (filter === 'all') return true
        if (filter === 'evaluated') return sub.status === 'evaluated' || sub.status === 'shortlisted'
        if (filter === 'pending') return sub.status === 'pending' || sub.status === 'submitted'
        return true
    })

    const completedCount = submissions.filter(s => s.status === 'evaluated' || s.status === 'shortlisted').length
    const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'submitted').length
    const avgScore = submissions
        .filter(s => s.scores?.percentage)
        .reduce((sum, s) => sum + (s.scores?.percentage || 0), 0) /
        (submissions.filter(s => s.scores?.percentage).length || 1)

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#E8C547] border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* ========== PAGE HEADER ========== */}
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Award className="w-7 h-7 text-[#E8C547]" /> My Achievements
                    </h1>
                    <p className="text-white/50 mt-1">Track your assessment progress and download reports</p>
                </div>
            </div>

            {/* ========== STATS CARDS ========== */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <p className="text-3xl font-bold text-white">{completedCount}</p>
                    <p className="text-sm text-white/50">Completed</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <p className="text-3xl font-bold text-white">{pendingCount}</p>
                    <p className="text-sm text-white/50">In Progress</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <p className="text-3xl font-bold text-[#E8C547]">{Math.round(avgScore || 0)}%</p>
                    <p className="text-sm text-white/50">Avg Score</p>
                </div>
            </div>

            {/* ========== FILTER TABS ========== */}
            <div className="flex gap-2">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className={filter === 'all'
                        ? 'bg-[#E8C547] hover:bg-[#E8C547]/90 text-black'
                        : 'border-white/10 text-white hover:bg-white/10'}
                >
                    All ({submissions.length})
                </Button>
                <Button
                    variant={filter === 'evaluated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('evaluated')}
                    className={filter === 'evaluated'
                        ? 'bg-[#E8C547] hover:bg-[#E8C547]/90 text-black'
                        : 'border-white/10 text-white hover:bg-white/10'}
                >
                    Evaluated ({completedCount})
                </Button>
                <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                    className={filter === 'pending'
                        ? 'bg-[#E8C547] hover:bg-[#E8C547]/90 text-black'
                        : 'border-white/10 text-white hover:bg-white/10'}
                >
                    Pending ({pendingCount})
                </Button>
            </div>

            {/* ========== SUBMISSIONS LIST ========== */}
            {filteredSubmissions.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-white/30" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                        {submissions.length === 0
                            ? 'No assessments yet'
                            : 'No matching assessments'}
                    </h3>
                    <p className="text-white/50">
                        {submissions.length === 0
                            ? 'Start taking assessments to track your progress here.'
                            : 'Try changing your filter selection.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSubmissions.map((submission) => {
                        const statusConfig = getStatusConfig(submission.status)
                        const StatusIcon = statusConfig.icon

                        return (
                            <div key={submission.id} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/[0.08] transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4 flex-1">
                                        <div className="w-12 h-12 rounded bg-gradient-to-br from-[#E8C547] to-amber-600 flex items-center justify-center text-black font-bold text-xl uppercase">
                                            {submission.company?.charAt(0) || 'A'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-white">{submission.jobTitle || 'Assessment'}</h3>
                                                <Badge variant="secondary" className={`flex items-center gap-1 ${statusConfig.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusConfig.label}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-white/60 flex items-center gap-2 mb-3">
                                                <Building className="w-4 h-4" />
                                                {submission.company || 'Unknown Company'}
                                            </p>

                                            {/* Score display */}
                                            {submission.scores?.percentage !== undefined && (
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-white font-medium">
                                                        Score: {Math.round(submission.scores.percentage)}%
                                                    </span>
                                                    {submission.scores.mcq !== undefined && (
                                                        <span className="text-white/50">MCQ: {submission.scores.mcq}%</span>
                                                    )}
                                                    {submission.scores.subjective !== undefined && (
                                                        <span className="text-white/50">Subjective: {submission.scores.subjective}%</span>
                                                    )}
                                                    {submission.scores.coding !== undefined && (
                                                        <span className="text-white/50">Coding: {submission.scores.coding}%</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Dates */}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                                                {submission.submittedAt && (
                                                    <span>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</span>
                                                )}
                                                {submission.evaluatedAt && (
                                                    <span>Evaluated: {new Date(submission.evaluatedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {(submission.status === 'evaluated' || submission.status === 'shortlisted') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownloadReport(submission)}
                                                disabled={downloadingId === submission.id}
                                                className="border-white/10 text-white hover:bg-white/10"
                                            >
                                                {downloadingId === submission.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Downloading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download Report
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
