"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    BarChart3,
    TrendingUp,
    Users,
    FileText,
    Target,
    AlertTriangle,
    Calendar,
    Filter,
    Download,
    Brain,
    Shield,
    Award
} from "lucide-react"
import { getAllSubmissions, getSubmissionStats } from "@/lib/submissionService"
import { CandidateSubmission } from "@/lib/submissionService"
import { getBenchmarkComparison } from "@/lib/benchmarkService"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip } from "recharts"
import { toast } from "sonner"

export default function AnalyticsPage() {
    const [submissions, setSubmissions] = useState<CandidateSubmission[]>([])
    const [loading, setLoading] = useState(true)
    const [assessmentFilter, setAssessmentFilter] = useState<string>('all')
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

    useEffect(() => {
        loadData()

        // Listen for new submissions
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'recruiter_submissions') {
                loadData()
            }
        }

        const handleCustomStorage = () => {
            loadData()
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('submissionUpdated', handleCustomStorage)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('submissionUpdated', handleCustomStorage)
        }
    }, [])

    const loadData = async () => {
        try {
            const allSubmissions = await getAllSubmissions()
            setSubmissions(allSubmissions)
        } catch (error) {
            console.error('Error loading submissions:', error)
        } finally {
            setLoading(false)
        }
    }

    // Get unique assessments - use both assessmentId and jobId to handle cases where they differ
    const assessments = useMemo(() => {
        const unique = new Map<string, { id: string; title: string; company: string }>()
        submissions.forEach(s => {
            // Use assessmentId as primary key, but also include jobId if different
            const key = s.assessmentId || s.jobId
            if (key && !unique.has(key)) {
                unique.set(key, {
                    id: key,
                    title: s.jobTitle || 'Untitled Assessment',
                    company: s.company || 'Unknown Company'
                })
            }
        })
        return Array.from(unique.values())
    }, [submissions])

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        let filtered = [...submissions]

        // Assessment filter - check both assessmentId and jobId since sometimes assessmentId might be jobId
        if (assessmentFilter !== 'all') {
            filtered = filtered.filter(s => 
                s.assessmentId === assessmentFilter || 
                s.jobId === assessmentFilter
            )
        }

        // Date range filter
        if (dateRange !== 'all') {
            const now = new Date()
            const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
            const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
            filtered = filtered.filter(s => {
                const submittedDate = new Date(s.submittedAt)
                return submittedDate >= cutoffDate
            })
        }

        return filtered
    }, [submissions, assessmentFilter, dateRange])

    // Calculate statistics from filtered submissions
    const stats = useMemo(() => {
        const evaluated = filteredSubmissions.filter(s => s.scores)
        const avgScore = evaluated.length > 0
            ? evaluated.reduce((sum, s) => sum + (s.scores?.percentage || 0), 0) / evaluated.length
            : 0

        return {
            total: filteredSubmissions.length,
            pending: filteredSubmissions.filter(s => s.status === 'pending').length,
            evaluated: evaluated.length,
            shortlisted: filteredSubmissions.filter(s => s.status === 'shortlisted').length,
            rejected: filteredSubmissions.filter(s => s.status === 'rejected').length,
            averageScore: avgScore,
            totalFiltered: filteredSubmissions.length
        }
    }, [filteredSubmissions])

    // Score distribution data
    const scoreDistribution = useMemo(() => {
        const buckets = [
            { range: '0-20', min: 0, max: 20, count: 0 },
            { range: '21-40', min: 21, max: 40, count: 0 },
            { range: '41-60', min: 41, max: 60, count: 0 },
            { range: '61-80', min: 61, max: 80, count: 0 },
            { range: '81-100', min: 81, max: 100, count: 0 }
        ]

        filteredSubmissions.forEach(s => {
            if (s.scores?.percentage !== undefined) {
                const percentage = s.scores.percentage
                const bucket = buckets.find(b => percentage >= b.min && percentage <= b.max)
                if (bucket) bucket.count++
            }
        })

        return buckets.map(b => ({ range: b.range, count: b.count }))
    }, [filteredSubmissions])

    // Submissions over time
    const submissionsOverTime = useMemo(() => {
        const timeMap = new Map<string, number>()

        filteredSubmissions.forEach(s => {
            const date = new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            timeMap.set(date, (timeMap.get(date) || 0) + 1)
        })

        return Array.from(timeMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-14) // Last 14 days
    }, [filteredSubmissions])

    // Skill performance
    const skillPerformance = useMemo(() => {
        const skillMap = new Map<string, { total: number; score: number; count: number }>()

        filteredSubmissions.forEach(s => {
            if (s.scores?.skillScores) {
                Object.entries(s.scores.skillScores).forEach(([skill, data]) => {
                    if (!skillMap.has(skill)) {
                        skillMap.set(skill, { total: 0, score: 0, count: 0 })
                    }
                    const entry = skillMap.get(skill)!
                    entry.total += data.total
                    entry.score += data.score
                    entry.count++
                })
            }
        })

        return Array.from(skillMap.entries())
            .map(([skill, data]) => ({
                skill,
                percentage: data.total > 0 ? Math.round((data.score / data.total) * 100) : 0,
                count: data.count
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10) // Top 10 skills
    }, [filteredSubmissions])

    // Assessment performance
    const assessmentPerformance = useMemo(() => {
        const assessmentMap = new Map<string, { title: string; submissions: number; avgScore: number; totalScore: number }>()

        filteredSubmissions.forEach(s => {
            if (!assessmentMap.has(s.assessmentId)) {
                assessmentMap.set(s.assessmentId, {
                    title: s.jobTitle,
                    submissions: 0,
                    avgScore: 0,
                    totalScore: 0
                })
            }
            const entry = assessmentMap.get(s.assessmentId)!
            entry.submissions++
            if (s.scores?.percentage) {
                entry.totalScore += s.scores.percentage
            }
        })

        return Array.from(assessmentMap.entries())
            .map(([id, data]) => ({
                id,
                title: data.title.length > 30 ? data.title.substring(0, 30) + '...' : data.title,
                submissions: data.submissions,
                avgScore: data.submissions > 0 ? Math.round(data.totalScore / data.submissions) : 0
            }))
            .sort((a, b) => b.submissions - a.submissions)
    }, [filteredSubmissions])

    // Status distribution
    const statusDistribution = useMemo(() => {
        const statusCounts = {
            pending: 0,
            evaluated: 0,
            shortlisted: 0,
            rejected: 0
        }

        filteredSubmissions.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
        })

        return [
            { name: 'Pending', value: statusCounts.pending, color: '#f59e0b' },
            { name: 'Evaluated', value: statusCounts.evaluated, color: '#3b82f6' },
            { name: 'Shortlisted', value: statusCounts.shortlisted, color: '#10b981' },
            { name: 'Rejected', value: statusCounts.rejected, color: '#ef4444' }
        ].filter(item => item.value > 0)
    }, [filteredSubmissions])

    // Anti-cheat stats
    const antiCheatStats = useMemo(() => {
        let flaggedCount = 0
        let totalTabSwitches = 0
        let totalPasteDetections = 0

        filteredSubmissions.forEach(s => {
            const antiCheat = s.antiCheatData || {}
            if ((antiCheat.tab_switches || 0) > 0 || antiCheat.copy_paste_detected) {
                flaggedCount++
            }
            totalTabSwitches += antiCheat.tab_switches || 0
            if (antiCheat.copy_paste_detected) {
                totalPasteDetections++
            }
        })

        return {
            flaggedCount,
            totalTabSwitches,
            totalPasteDetections,
            flaggedPercentage: filteredSubmissions.length > 0
                ? Math.round((flaggedCount / filteredSubmissions.length) * 100)
                : 0
        }
    }, [filteredSubmissions])

    // Generate insights
    const insights = useMemo(() => {
        const insights: string[] = []

        if (stats.averageScore >= 75) {
            insights.push("Excellent average performance across all assessments. Candidates are well-prepared.")
        } else if (stats.averageScore >= 60) {
            insights.push("Good average performance. Consider reviewing assessment difficulty.")
        } else {
            insights.push("Average performance is below expectations. Review assessment content and candidate pool.")
        }

        if (skillPerformance.length > 0) {
            const topSkill = skillPerformance[0]
            insights.push(`Top performing skill: ${topSkill.skill} (${topSkill.percentage}% average)`)
        }

        if (antiCheatStats.flaggedPercentage > 20) {
            insights.push(`High anti-cheat flag rate (${antiCheatStats.flaggedPercentage}%). Consider reviewing assessment security measures.`)
        }

        if (stats.shortlisted > 0 && stats.total > 0) {
            const shortlistRate = Math.round((stats.shortlisted / stats.total) * 100)
            insights.push(`Shortlist rate: ${shortlistRate}% of candidates are shortlisted.`)
        }

        return insights
    }, [stats, skillPerformance, antiCheatStats])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Analytics</h1>
                    <p className="text-white/40 mt-1">Performance insights and trends</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => {
                        try {
                            const headers = ['Assessment', 'Candidate Name', 'Email', 'Score %', 'Status', 'Submitted At', 'Tab Switches', 'Copy/Paste']
                            const rows = filteredSubmissions.map(s => [
                                s.jobTitle || 'N/A',
                                s.candidateInfo?.name || 'Unknown',
                                s.candidateInfo?.email || 'N/A',
                                s.scores?.percentage || 'N/A',
                                s.status || 'pending',
                                s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'N/A',
                                (s.antiCheatData?.tab_switches ?? 0).toString(),
                                s.antiCheatData?.copy_paste_detected ? 'Yes' : 'No'
                            ])

                            const csvContent = [
                                headers.join(','),
                                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                            ].join('\n')

                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                            const link = document.createElement('a')
                            const url = URL.createObjectURL(blob)
                            link.setAttribute('href', url)
                            link.setAttribute('download', `analytics_export_${new Date().toISOString().split('T')[0]}.csv`)
                            link.style.visibility = 'hidden'
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            URL.revokeObjectURL(url)

                            toast.success('Analytics report exported successfully!')
                        } catch (error) {
                            console.error('Error exporting analytics:', error)
                            toast.error('Failed to export analytics report')
                        }
                    }}
                    className="border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-white/60 mb-2 block">Assessment</label>
                        <select
                            value={assessmentFilter}
                            onChange={(e) => setAssessmentFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="all" className="bg-[#1a1a1a] text-white">All Assessments</option>
                            {assessments.map(assessment => (
                                <option key={assessment.id} value={assessment.id} className="bg-[#1a1a1a] text-white">
                                    {assessment.title} - {assessment.company}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium text-white/60 mb-2 block">Date Range</label>
                        <div className="flex gap-2">
                            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                                <Button
                                    key={range}
                                    variant={dateRange === range ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setDateRange(range)}
                                    className={dateRange === range
                                        ? 'bg-white text-black'
                                        : 'border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}
                                >
                                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <p className="text-sm text-white/40 mb-2">Total Candidates</p>
                    <div className="text-3xl font-semibold text-white">{stats.totalFiltered}</div>
                    <p className="text-xs text-white/30 mt-1">Filtered results</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <p className="text-sm text-white/40 mb-2">Average Score</p>
                    <div className="text-3xl font-semibold text-blue-400">
                        {Math.round(stats.averageScore)}%
                    </div>
                    <p className="text-xs text-white/30 mt-1">Across all submissions</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <p className="text-sm text-white/40 mb-2">Shortlisted</p>
                    <div className="text-3xl font-semibold text-emerald-400">{stats.shortlisted}</div>
                    <p className="text-xs text-white/30 mt-1">{stats.total > 0 ? Math.round((stats.shortlisted / stats.total) * 100) : 0}% of total</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <p className="text-sm text-white/40 mb-2">Flagged</p>
                    <div className="text-3xl font-semibold text-amber-400">{antiCheatStats.flaggedCount}</div>
                    <p className="text-xs text-white/30 mt-1">Anti-cheat flags</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Score Distribution */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">Score Distribution</h3>
                    </div>
                    <p className="text-sm text-white/40 mb-4">Distribution of candidate scores</p>
                    <ChartContainer
                        config={{
                            count: {
                                label: "Candidates",
                                color: "#3b82f6",
                            },
                        }}
                        className="h-[300px]"
                    >
                        <BarChart data={scoreDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="range" stroke="rgba(255,255,255,0.4)" />
                            <YAxis stroke="rgba(255,255,255,0.4)" />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: 'white' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                </div>

                {/* Submissions Over Time */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">Submissions Over Time</h3>
                    </div>
                    <p className="text-sm text-white/40 mb-4">Daily submission trends</p>
                    <ChartContainer
                        config={{
                            count: {
                                label: "Submissions",
                                color: "#10b981",
                            },
                        }}
                        className="h-[300px]"
                    >
                        <LineChart data={submissionsOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" />
                            <YAxis stroke="rgba(255,255,255,0.4)" />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: 'white' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#10b981' }}
                            />
                        </LineChart>
                    </ChartContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Top Skills */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-semibold text-white">Top Performing Skills</h3>
                    </div>
                    <p className="text-sm text-white/40 mb-4">Average performance by skill</p>
                    <ChartContainer
                        config={{
                            percentage: {
                                label: "Score %",
                                color: "#f59e0b",
                            },
                        }}
                        className="h-[300px]"
                    >
                        <BarChart data={skillPerformance} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.4)" />
                            <YAxis dataKey="skill" type="category" width={100} stroke="rgba(255,255,255,0.4)" />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: 'white' }}
                            />
                            <Bar dataKey="percentage" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                        </BarChart>
                    </ChartContainer>
                </div>

                {/* Status Distribution */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">Status Distribution</h3>
                    </div>
                    <p className="text-sm text-white/40 mb-4">Candidate status breakdown</p>
                    <ChartContainer
                        config={{
                            pending: { color: "#f59e0b" },
                            evaluated: { color: "#3b82f6" },
                            shortlisted: { color: "#10b981" },
                            rejected: { color: "#ef4444" },
                        }}
                        className="h-[300px]"
                    >
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                labelStyle={{ color: 'white' }}
                            />
                            <Legend wrapperStyle={{ color: 'white' }} />
                        </PieChart>
                    </ChartContainer>
                </div>
            </div>

            {/* Assessment Performance Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">Assessment Performance</h3>
                    </div>
                    <p className="text-sm text-white/40">Performance metrics by assessment</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Assessment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Submissions</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Avg Score</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {assessmentPerformance.map((assessment) => (
                                <tr key={assessment.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-4 font-medium text-white">{assessment.title}</td>
                                    <td className="px-4 py-4 text-white/60">{assessment.submissions}</td>
                                    <td className="px-4 py-4">
                                        <span className={`font-semibold ${assessment.avgScore >= 75 ? 'text-emerald-400' :
                                                assessment.avgScore >= 60 ? 'text-blue-400' :
                                                    'text-red-400'
                                            }`}>
                                            {assessment.avgScore}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="w-32 bg-white/10 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${assessment.avgScore >= 75 ? 'bg-emerald-500' :
                                                        assessment.avgScore >= 60 ? 'bg-blue-500' :
                                                            'bg-red-500'
                                                    }`}
                                                style={{ width: `${assessment.avgScore}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">AI Insights & Recommendations</h3>
                </div>
                <div className="space-y-3">
                    {insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <Brain className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-white/80">{insight}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
