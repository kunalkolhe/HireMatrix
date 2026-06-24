"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Candidate {
    id: string
    name: string
    email: string
    score: number
    totalPossible: number
    percentage: number | null
    submittedAt: string
    timeSpent: number
    status: 'pending' | 'shortlisted' | 'rejected'
    tabSwitches: number
    pasteCount: number
    userId?: string
}

interface Job {
    id: string
    title: string
    company: string
    config: Record<string, any>
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
                    const savedJobs = JSON.parse(localStorage.getItem('hirematrix_jobs') || '[]')
                    const foundJob = savedJobs.find((j: Job) => j.id === jobId)
                    if (foundJob) {
                        setJob(foundJob)
                    }
                }

                // Load real candidate data from submissions
                const { getSubmissionsByJob } = await import('@/lib/submissionServiceSupabase')
                const supabaseCandidates = await getSubmissionsByJob(jobId)

                // Convert to candidate format
                let realCandidates: Candidate[] = supabaseCandidates.map((s: any) => ({
                    id: s.id,
                    name: s.candidateInfo?.name || 'Unknown',
                    email: s.candidateInfo?.email || 'N/A',
                    score: s.scores?.totalScore || 0,
                    totalPossible: s.scores?.totalPossible || 100,
                    percentage: s.scores?.percentage !== undefined ? s.scores.percentage : null,
                    submittedAt: s.submittedAt,
                    timeSpent: s.answers ? Math.round(Object.values(s.answers).reduce((acc: number, a: any) => acc + (a.time_spent_seconds || 0), 0) / 60) : 0,
                    status: (s.status === 'shortlisted' || s.status === 'rejected' || s.status === 'evaluated') ? s.status : 'pending',
                    tabSwitches: s.antiCheatData?.tab_switches || 0,
                    pasteCount: s.antiCheatData?.copy_paste_detected ? 1 : 0,
                    userId: s.candidate_id || s.candidateInfo?.userId || null
                }))

                // Apply localStorage overrides to bypass any Supabase RLS update restrictions
                try {
                    const localData = localStorage.getItem('recruiter_submissions')
                    if (localData) {
                        const localSubmissions = JSON.parse(localData)
                        realCandidates = realCandidates.map(rc => {
                            const localMatch = localSubmissions.find((ls: any) => ls.id === rc.id)
                            if (localMatch && localMatch.status) {
                                return { ...rc, status: localMatch.status }
                            }
                            return rc
                        })
                    }
                } catch (e) {
                    console.error('Error applying local overrides', e)
                }

                if (realCandidates.length === 0) {
                    throw new Error('No candidates found in Supabase, trying fallback')
                }

                setCandidates(realCandidates.sort((a, b) => {
                    if ((b.percentage || 0) !== (a.percentage || 0)) {
                        return (b.percentage || 0) - (a.percentage || 0)
                    }
                    return a.timeSpent - b.timeSpent
                }))
            } catch (error) {
                console.error('Error loading data:', error)
                // Fallback to localStorage
                const savedJobs = JSON.parse(localStorage.getItem('hirematrix_jobs') || '[]')
                const foundJob = savedJobs.find((j: Job) => j.id === jobId)
                if (foundJob) {
                    setJob(foundJob)
                }

                const { getAllSubmissions } = require('@/lib/submissionService')
                const allSubmissions = getAllSubmissions()
                const jobSubmissions = allSubmissions.filter((s: any) => s.assessmentId === jobId)
                const realCandidates: Candidate[] = jobSubmissions.map((s: any) => ({
                    id: s.id,
                    name: s.candidateInfo?.name || 'Unknown',
                    email: s.candidateInfo?.email || 'N/A',
                    score: s.scores?.totalScore || 0,
                    totalPossible: s.scores?.totalPossible || 100,
                    percentage: s.scores?.percentage !== undefined ? s.scores.percentage : null,
                    submittedAt: s.submittedAt,
                    timeSpent: s.answers ? Math.round(Object.values(s.answers).reduce((acc: number, a: any) => acc + (a.time_spent_seconds || 0), 0) / 60) : 0,
                    status: (s.status === 'shortlisted' || s.status === 'rejected' || s.status === 'evaluated') ? s.status : 'pending',
                    tabSwitches: s.antiCheatData?.tab_switches || 0,
                    pasteCount: s.antiCheatData?.copy_paste_detected ? 1 : 0,
                    userId: s.candidate_id || s.candidateInfo?.userId || null
                }))
                setCandidates(realCandidates.sort((a, b) => {
                    if ((b.percentage || 0) !== (a.percentage || 0)) {
                        return (b.percentage || 0) - (a.percentage || 0)
                    }
                    return a.timeSpent - b.timeSpent
                }))
            } finally {
                setLoading(false)
            }
        }

        loadData()

        // Listen for new submissions from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'recruiter_submissions') {
                loadData()
            }
        }

        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [jobId])

    const filteredCandidates = filter === 'all'
        ? candidates
        : candidates.filter(c => c.status === filter)

    const handleStatusChange = async (candidateId: string, newStatus: 'pending' | 'evaluated' | 'shortlisted' | 'rejected') => {
        const targetCandidate = candidates.find(c => c.id === candidateId)
        if (!targetCandidate) return
        
        const oldStatus = targetCandidate.status

        // Optimistic UI update
        setCandidates(prev => prev.map(c =>
            c.id === candidateId ? { ...c, status: newStatus } : c
        ))
        
        // Persist to backend
        try {
            const { updateSubmissionStatus } = await import('@/lib/submissionService')
            const success = await updateSubmissionStatus(candidateId, newStatus)
            
            if (!success) {
                // Revert optimistic update
                setCandidates(prev => prev.map(c =>
                    c.id === candidateId ? { ...c, status: oldStatus } : c
                ))
                toast.error(`Failed to update status for ${targetCandidate.name}. Please try again.`)
                return
            }
            
            toast.success(`${targetCandidate.name} marked as ${newStatus}`)
            
            // Notify Candidate
            if (targetCandidate.userId) {
                const stored = localStorage.getItem(`notifications_${targetCandidate.userId}`)
                const notifications = stored ? JSON.parse(stored) : []
                notifications.unshift({
                    id: Date.now().toString(),
                    title: `Application ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
                    text: `Your application for the ${job?.title} position has been ${newStatus}.`,
                    date: new Date().toISOString(),
                    read: false
                })
                localStorage.setItem(`notifications_${targetCandidate.userId}`, JSON.stringify(notifications))
                window.dispatchEvent(new Event('notificationUpdate'))
            }
        } catch (error) {
            console.error('Failed to update status:', error)
            setCandidates(prev => prev.map(c =>
                c.id === candidateId ? { ...c, status: oldStatus } : c
            ))
            toast.error('An error occurred while updating status')
        }
    }

    const getRankIcon = (candidate: Candidate, allCandidates: Candidate[]) => {
        if (candidate.percentage === null || candidate.percentage === 0) {
            return <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#13163a] font-bold text-white/60 border border-white/10">-</span>
        }
        const uniqueScores = Array.from(new Set(allCandidates.filter(c => c.percentage !== null && c.percentage > 0).map(c => c.percentage as number))).sort((a, b) => b - a)
        const rank = uniqueScores.indexOf(candidate.percentage)

        if (rank === 0) return <div className="flex items-center justify-center w-10 h-10 bg-yellow-500/20 rounded-full border border-yellow-500/30"><Medal className="w-5 h-5 text-yellow-400" /></div>
        if (rank === 1) return <div className="flex items-center justify-center w-10 h-10 bg-slate-300/20 rounded-full border border-slate-300/30"><Medal className="w-5 h-5 text-slate-300" /></div>
        if (rank === 2) return <div className="flex items-center justify-center w-10 h-10 bg-amber-600/20 rounded-full border border-amber-600/30"><Medal className="w-5 h-5 text-amber-500" /></div>
        
        // Calculate standard rank for the number display (e.g. if 3 people tied for 1st, next person is 4th)
        const standardRank = allCandidates.filter(c => (c.percentage || 0) > (candidate.percentage || 0)).length
        return <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#13163a] font-bold text-white/60 border border-white/10">{standardRank + 1}</span>
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
                        className="text-white/40 hover:text-white p-0 h-auto mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold font-mono text-white">Leaderboard</h1>
                    <p className="text-white/60">Results for <span className="text-white font-medium">{job?.title}</span></p>
                </div>

                <div className="flex gap-2 bg-[#13163a] p-1 rounded-xl">
                    {(['all', 'shortlisted', 'pending', 'rejected'] as const).map((f) => (
                        <Button
                            key={f}
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilter(f)}
                            className={`capitalize rounded-lg ${filter === f
                                ? 'bg-primary text-white shadow-lg font-medium'
                                : 'text-white/40 hover:text-white hover:bg-[#13163a]'
                                }`}
                        >
                            {f}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Candidates List */}
            <Card className="bg-[#13163a] border-white/10 backdrop-blur-xl">
                <div className="p-4 border-b border-white/8 flex items-center justify-between">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                        <Input placeholder="Search candidates..." className="pl-9 bg-black/20 border-white/10 w-[300px]" />
                    </div>
                    <Button variant="outline" className="text-white/60 border-white/10 hover:bg-[#13163a] gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                    </Button>
                </div>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 divide-y divide-white/5">
                        {filteredCandidates.map((candidate) => {
                            return (
                            <div
                                key={candidate.id}
                                className="group flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/5 transition-colors gap-4 last:rounded-b-xl"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 flex justify-center flex-shrink-0">
                                        {getRankIcon(candidate, candidates)}
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
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">Flagged</span>
                                                    )}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-white/60">{candidate.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 pl-16 md:pl-0">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white">{candidate.percentage !== null ? `${candidate.percentage}%` : '—'}</div>
                                        <div className="text-xs text-white/60 uppercase tracking-wide">Score</div>
                                    </div>

                                    <div className="text-center hidden sm:block">
                                        <div className="text-lg font-medium text-slate-300">{candidate.timeSpent}m</div>
                                        <div className="text-xs text-white/60 uppercase tracking-wide">Time</div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="outline-none">
                                                <Badge className={`h-8 px-3 cursor-pointer ${
                                                    candidate.status === 'shortlisted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
                                                    candidate.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' :
                                                    candidate.status === 'evaluated' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                                } capitalize`}>
                                                    {candidate.status}
                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                </Badge>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 bg-[#0D1225] border-white/10 text-white">
                                                <DropdownMenuLabel className="text-xs text-white/40 font-semibold uppercase">Update Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-white/10" />
                                                <DropdownMenuItem onClick={() => handleStatusChange(candidate.id, 'shortlisted')} className="cursor-pointer hover:bg-white/5 focus:bg-emerald-500/20 focus:text-emerald-400">
                                                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Shortlist
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(candidate.id, 'rejected')} className="cursor-pointer hover:bg-white/5 focus:bg-red-500/20 focus:text-red-400">
                                                    <XCircle className="w-4 h-4 mr-2 text-red-500" /> Reject
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(candidate.id, 'pending')} className="cursor-pointer hover:bg-white/5 focus:bg-amber-500/20 focus:text-amber-400">
                                                    <Clock className="w-4 h-4 mr-2 text-amber-500" /> Pending
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link href={`/recruiter/candidates/${candidate.id}`}>
                                                <Button variant="outline" size="sm" className="border-white/10 hover:bg-[#13163a] hover:text-white">
                                                    View Report
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )
                        })}

                        {filteredCandidates.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="w-16 h-16 bg-[#13163a] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-white/60" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">No candidates found</h3>
                                <p className="text-white/60">Try adjusting your filters.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
