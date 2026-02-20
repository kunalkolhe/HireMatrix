"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Brain,
    ArrowLeft,
    Trophy,
    Medal,
    Award,
    User,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    ChevronDown,
    SlidersHorizontal,
    Search
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface Candidate {
    id: string
    name: string
    email: string
    score: number
    totalPossible: number
    percentage: number
    submittedAt: string
    timeSpent: number
    status: 'pending' | 'shortlisted' | 'rejected'
    tabSwitches: number
    pasteCount: number
}

interface Job {
    id: string
    title: string
    company: string
    config: {
        passing_percentage: number
    }
}

export default function LeaderboardPage() {
    const params = useParams()
    const router = useRouter()
    const jobId = params.id as string

    const [job, setJob] = useState<Job | null>(null)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [filter, setFilter] = useState<'all' | 'shortlisted' | 'rejected' | 'pending'>('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load job data from Supabase
                const { getJobById } = await import('@/lib/jobService')
                const supabaseJob = await getJobById(jobId)

                if (supabaseJob) {
                    setJob({
                        id: supabaseJob.id,
                        title: supabaseJob.title,
                        company: supabaseJob.company || '',
                        config: supabaseJob.assessment?.config || { passing_percentage: 50 }
                    })
                } else {
                    // Fallback to localStorage
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const foundJob = savedJobs.find((j: Job) => j.id === jobId)
                    if (foundJob) {
                        setJob(foundJob)
                    }
                }

                // Load real candidate data from submissions
                const { getAllSubmissions } = await import('@/lib/submissionService')
                const allSubmissions = await getAllSubmissions()

                // Filter submissions for this job
                const jobSubmissions = allSubmissions.filter((s: any) => s.jobId === jobId || s.assessmentId === jobId)

                // Convert to candidate format
                const realCandidates: Candidate[] = jobSubmissions.map((s: any) => ({
                    id: s.id,
                    name: s.candidateInfo?.name || 'Unknown',
                    email: s.candidateInfo?.email || '',
                    score: s.scores?.totalScore || 0,
                    totalPossible: s.scores?.totalPossible || 100,
                    percentage: s.scores?.percentage || 0,
                    submittedAt: s.submittedAt,
                    timeSpent: s.timeSpent || 0,
                    status: s.status === 'shortlisted' ? 'shortlisted' : s.status === 'rejected' ? 'rejected' : 'pending',
                    tabSwitches: s.antiCheatData?.tab_switches || 0,
                    pasteCount: s.antiCheatData?.copy_paste_detected ? 1 : 0
                }))

                setCandidates(realCandidates.sort((a, b) => b.percentage - a.percentage))
            } catch (error) {
                console.error('Error loading data:', error)
                // Fallback to localStorage
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const foundJob = savedJobs.find((j: Job) => j.id === jobId)
                if (foundJob) {
                    setJob(foundJob)
                }

                const { getAllSubmissions } = require('@/lib/submissionService')
                const allSubmissions = getAllSubmissions()
                const jobSubmissions = allSubmissions.filter((s: any) => s.assessmentId === jobId)
                const realCandidates: Candidate[] = jobSubmissions.map((s: any) => ({
                    id: s.id,
                    name: s.candidateInfo.name,
                    email: s.candidateInfo.email,
                    score: s.scores?.totalScore || 0,
                    totalPossible: s.scores?.totalPossible || 100,
                    percentage: s.scores?.percentage || 0,
                    submittedAt: s.submittedAt,
                    timeSpent: s.timeSpent || 0,
                    status: s.status === 'shortlisted' ? 'shortlisted' : s.status === 'rejected' ? 'rejected' : 'pending',
                    tabSwitches: s.antiCheatData?.tab_switches || 0,
                    pasteCount: s.antiCheatData?.copy_paste_detected ? 1 : 0
                }))
                setCandidates(realCandidates.sort((a, b) => b.percentage - a.percentage))
            } finally {
                setLoading(false)
            }
        }

        loadData()

        // Listen for new submissions
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'recruiter_submissions') {
                loadData()
            }
        }

        const handleCustomEvent = () => {
            loadData()
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
    }, [jobId])

    const filteredCandidates = filter === 'all'
        ? candidates
        : candidates.filter(c => c.status === filter)

    const handleStatusChange = (candidateId: string, newStatus: 'shortlisted' | 'rejected') => {
        setCandidates(prev => prev.map(c =>
            c.id === candidateId ? { ...c, status: newStatus } : c
        ))
    }

    const getRankIcon = (index: number) => {
        if (index === 0) return <div className="p-2 bg-yellow-500/10 rounded-full border border-yellow-500/20"><Trophy className="w-5 h-5 text-yellow-400" /></div>
        if (index === 1) return <div className="p-2 bg-slate-400/10 rounded-full border border-slate-400/20"><Medal className="w-5 h-5 text-slate-300" /></div>
        if (index === 2) return <div className="p-2 bg-amber-700/10 rounded-full border border-amber-700/20"><Award className="w-5 h-5 text-amber-600" /></div>
        return <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 font-bold text-slate-400">{index + 1}</span>
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" /></div>

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-white/50 hover:text-white p-0 h-auto mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
                    <p className="text-slate-400">Results for <span className="text-white font-medium">{job?.title}</span></p>
                </div>

                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                    {(['all', 'shortlisted', 'pending', 'rejected'] as const).map((f) => (
                        <Button
                            key={f}
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilter(f)}
                            className={`capitalize rounded-lg ${filter === f
                                ? 'bg-white text-black shadow-lg'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {f}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Candidates List */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
                        <Input placeholder="Search candidates..." className="pl-9 bg-black/20 border-white/10 w-[300px]" />
                    </div>
                    <Button variant="outline" className="text-white/60 border-white/10 hover:bg-white/5 gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                    </Button>
                </div>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 divide-y divide-white/5">
                        {filteredCandidates.map((candidate, index) => (
                            <div
                                key={candidate.id}
                                className="group flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/5 transition-colors gap-4"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 flex justify-center flex-shrink-0">
                                        {getRankIcon(index)}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-white font-bold text-lg border border-white/10">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <div>
                                            <Link href={`/recruiter/candidates/${candidate.id}`} className="block">
                                                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                    {candidate.name}
                                                    {(candidate.tabSwitches > 0 || candidate.pasteCount > 0) && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Flagged</span>
                                                    )}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-slate-500">{candidate.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 pl-16 md:pl-0">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white">{candidate.percentage}%</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Score</div>
                                    </div>

                                    <div className="text-center hidden sm:block">
                                        <div className="text-lg font-medium text-slate-300">{candidate.timeSpent}m</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Time</div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Badge className={`h-8 px-3 ${candidate.status === 'shortlisted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            candidate.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            } capitalize`}>
                                            {candidate.status}
                                        </Badge>

                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {candidate.status === 'pending' && (
                                                <>
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" onClick={() => handleStatusChange(candidate.id, 'shortlisted')}>
                                                        <CheckCircle className="w-5 h-5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => handleStatusChange(candidate.id, 'rejected')}>
                                                        <XCircle className="w-5 h-5" />
                                                    </Button>
                                                </>
                                            )}
                                            <Link href={`/recruiter/candidates/${candidate.id}`}>
                                                <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/10 hover:text-white">
                                                    View Report
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredCandidates.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-slate-500" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">No candidates found</h3>
                                <p className="text-slate-500">Try adjusting your filters.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
