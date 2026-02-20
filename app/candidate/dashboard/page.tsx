"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Briefcase, Clock, ChevronRight, FileText, Code, MessageSquare, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { getSubmissionsByCandidate } from "@/lib/submissionService"
import { supabase } from "@/lib/supabase"

interface Job {
    id: string
    title: string
    company: string
    status?: string
    experience_level?: string
    parsed_skills?: {
        technical: string[]
        soft: string[]
        tools: string[]
        domain_knowledge: string[]
    }
    config?: {
        duration_minutes: number
        mcq_count?: number
        subjective_count?: number
        coding_count?: number
    }
    questions?: any[]
    createdAt?: string
    created_at?: string
    posted?: string // Added for display
}

export default function CandidateDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [jobs, setJobs] = useState<Job[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [mySubmissions, setMySubmissions] = useState<any[]>([])
    const [profileStrength, setProfileStrength] = useState({ percentage: 0, level: 'Beginner' })
    const [hasResume, setHasResume] = useState(false)

    useEffect(() => {
        const loadJobs = async () => {
            try {
                // Try Supabase first
                const { getActiveJobs } = await import('@/lib/jobService')
                const supabaseJobs = await getActiveJobs()

                if (supabaseJobs && supabaseJobs.length > 0) {
                    // Format for display
                    const formattedJobs = supabaseJobs
                        .filter((job: any) => job.questions && job.questions.length > 0)
                        .map((job: any) => ({
                            id: job.id,
                            title: job.title,
                            company: job.company,
                            description: job.description,
                            parsed_skills: job.parsed_skills,
                            experience_level: job.experience_level,
                            config: job.assessment?.config,
                            questions: job.questions || [],
                            status: 'active',
                            location: 'Remote',
                            type: 'Assessment',
                            posted: job.created_at
                                ? getTimeAgo(new Date(job.created_at))
                                : 'Recently'
                        }))
                    setJobs(formattedJobs)
                } else {
                    // Fallback to localStorage
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const activeJobs = savedJobs.filter((job: Job) =>
                        (job.status || 'draft') === 'active' && job.questions && job.questions.length > 0
                    )

                    const formattedJobs = activeJobs.map((job: Job) => ({
                        ...job,
                        location: 'Remote',
                        type: 'Assessment',
                        posted: job.createdAt || job.created_at
                            ? getTimeAgo(new Date((job.createdAt || job.created_at)!))
                            : 'Recently'
                    }))
                    setJobs(formattedJobs)
                }
            } catch (error) {
                console.error('Error loading jobs:', error)
                // Fallback to localStorage
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const activeJobs = savedJobs.filter((job: Job) =>
                    (job.status || 'draft') === 'active' && job.questions && job.questions.length > 0
                )

                const formattedJobs = activeJobs.map((job: Job) => ({
                    ...job,
                    location: 'Remote',
                    type: 'Assessment',
                    posted: job.createdAt || job.created_at
                        ? getTimeAgo(new Date((job.createdAt || job.created_at)!))
                        : 'Recently'
                }))
                setJobs(formattedJobs)
            } finally {
                setLoading(false)
            }
        }

        loadJobs()

        // Check resume status for display
        const checkResumeStatus = async () => {
            if (!user?.id) return

            try {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('has_resume')
                    .eq('id', user.id)
                    .maybeSingle()

                setHasResume(profile?.has_resume || false)
            } catch (error) {
                console.error('Error checking resume status:', error)
                setHasResume(false)
            }
        }

        checkResumeStatus()

        // Load candidate's submissions
        const loadMySubmissions = async () => {
            try {
                const candidateId = user?.id
                const candidateEmail = user?.email

                if (candidateId || candidateEmail) {
                    const submissions = await getSubmissionsByCandidate(candidateId, candidateEmail)
                    setMySubmissions(submissions)

                    // Calculate profile strength
                    const completed = submissions.filter(s => s.status === 'evaluated' || s.status === 'shortlisted').length
                    const total = submissions.length
                    const avgScore = submissions
                        .filter(s => s.scores?.percentage)
                        .reduce((sum, s) => sum + (s.scores?.percentage || 0), 0) /
                        (submissions.filter(s => s.scores?.percentage).length || 1)

                    let strength = 0
                    let level = 'Beginner'

                    if (total > 0) {
                        strength += Math.min(30, (completed / total) * 30) // 30% for completion rate
                    }
                    if (avgScore > 0) {
                        strength += Math.min(40, (avgScore / 100) * 40) // 40% for average score
                    }
                    if (user?.email && user?.user_metadata?.full_name) {
                        strength += 30 // 30% for profile completion
                    }

                    if (strength >= 80) level = 'Expert'
                    else if (strength >= 60) level = 'Advanced'
                    else if (strength >= 40) level = 'Intermediate'
                    else level = 'Beginner'

                    setProfileStrength({ percentage: Math.round(strength), level })
                }
            } catch (error) {
                console.error('Error loading submissions:', error)
            }
        }

        loadMySubmissions()

        // Listen for new submissions
        const handleStorageChange = () => {
            loadMySubmissions()
        }

        const handleCustomEvent = () => {
            loadMySubmissions()
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('submissionUpdated', handleCustomEvent)
            window.addEventListener('storage', handleStorageChange)

            // Also set up a periodic refresh (every 30 seconds) to ensure data sync
            const refreshInterval = setInterval(() => {
                loadMySubmissions()
            }, 30000)

            return () => {
                window.removeEventListener('submissionUpdated', handleCustomEvent)
                window.removeEventListener('storage', handleStorageChange)
                clearInterval(refreshInterval)
            }
        }
    }, [user])

    const getTimeAgo = (date: Date) => {
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return 'Just now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
        return `${Math.floor(diffInSeconds / 604800)}w ago`
    }

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* ========== HERO SEARCH ========== */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Find your next opportunity</h1>
                <p className="text-white/50 mb-8 max-w-xl mx-auto">Search through thousands of active job postings and take AI-powered assessments to prove your skills.</p>

                <div className="flex max-w-2xl mx-auto gap-2 bg-white/5 p-2 rounded-lg border border-white/10 focus-within:ring-2 focus-within:ring-[#E8C547] focus-within:border-transparent">
                    <div className="flex-1 flex items-center px-3">
                        <Search className="w-5 h-5 text-white/40 mr-2" />
                        <input
                            type="text"
                            placeholder="Search assessments by title or company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-sm outline-none bg-transparent text-white placeholder:text-white/40"
                        />
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* ========== JOB FEED ========== */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">Recommended for you</h2>
                        <Link href="#" className="text-sm font-semibold text-[#E8C547] hover:underline">View all</Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#E8C547] border-t-transparent" />
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-white/30" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">
                                {jobs.length === 0 ? 'No assessments available' : 'No assessments match your search'}
                            </h3>
                            <p className="text-white/50">
                                {jobs.length === 0
                                    ? 'Check back later for new assessment opportunities.'
                                    : 'Try adjusting your search terms.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredJobs.map((job) => {
                                const allSkills = [
                                    ...(job.parsed_skills?.technical || []),
                                    ...(job.parsed_skills?.tools || []),
                                    ...(job.parsed_skills?.domain_knowledge || [])
                                ]
                                const mcqCount = job.questions?.filter(q => q.type === 'mcq').length || job.config?.mcq_count || 0
                                const subjCount = job.questions?.filter(q => q.type === 'subjective').length || job.config?.subjective_count || 0
                                const codingCount = job.questions?.filter(q => q.type === 'coding').length || job.config?.coding_count || 0

                                return (
                                    <div key={job.id} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/[0.08] transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-4 flex-1">
                                                <div className="w-12 h-12 rounded bg-gradient-to-br from-[#E8C547] to-amber-600 flex items-center justify-center text-black font-bold text-xl uppercase">
                                                    {job.company.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-bold text-white group-hover:text-[#E8C547] transition-colors">{job.title}</h3>
                                                        {job.experience_level && (
                                                            <Badge variant="secondary" className="text-xs capitalize bg-white/10 text-white/70 border-white/10">
                                                                {job.experience_level}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-white/60 mb-3">{job.company}</p>

                                                    {/* Skills */}
                                                    {allSkills.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {allSkills.slice(0, 5).map((skill, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs border-white/10 text-white/60">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                            {allSkills.length > 5 && (
                                                                <Badge variant="outline" className="text-xs text-white/40 border-white/10">
                                                                    +{allSkills.length - 5} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap gap-4 text-xs text-white/50 mb-3">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {job.config?.duration_minutes || 60} mins
                                                        </span>
                                                        {mcqCount > 0 && (
                                                            <span className="flex items-center gap-1 text-blue-400">
                                                                <FileText className="w-3 h-3" />
                                                                {mcqCount} MCQs
                                                            </span>
                                                        )}
                                                        {subjCount > 0 && (
                                                            <span className="flex items-center gap-1 text-purple-400">
                                                                <MessageSquare className="w-3 h-3" />
                                                                {subjCount} Subjective
                                                            </span>
                                                        )}
                                                        {codingCount > 0 && (
                                                            <span className="flex items-center gap-1 text-green-400">
                                                                <Code className="w-3 h-3" />
                                                                {codingCount} Coding
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Briefcase className="w-3 h-3" />
                                                            {job.posted}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href={`/test/${job.id}`}>
                                                <Button className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                                    Start Assessment
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ========== SIDEBAR WIDGETS ========== */}
                <div className="space-y-6">
                    {/* Profile Strength */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Profile Strength</h3>
                            <span className="text-xs font-semibold text-[#E8C547] bg-[#E8C547]/10 px-2 py-1 rounded-full capitalize">
                                {profileStrength.level}
                            </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                            <div
                                className="bg-[#E8C547] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${profileStrength.percentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-white/50 mb-4">
                            {profileStrength.percentage < 50
                                ? 'Complete assessments to improve your profile strength.'
                                : profileStrength.percentage < 80
                                    ? 'Great progress! Keep completing assessments.'
                                    : 'Excellent! You have a strong profile.'}
                        </p>
                        {(!user?.email || !user?.user_metadata?.full_name) && (
                            <Link href="/candidate/profile">
                                <Button variant="outline" size="sm" className="w-full border-white/10 text-white hover:bg-white/10">Update Profile</Button>
                            </Link>
                        )}
                    </div>

                    {/* Resume Status */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Resume Status</h3>
                            <Link href="/candidate/resume">
                                <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10">
                                    <FileText className="w-4 h-4 mr-2" />
                                    {hasResume ? 'Update' : 'Upload'}
                                </Button>
                            </Link>
                        </div>
                        {hasResume ? (
                            <div className="flex items-center gap-2 text-sm text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                                <span>Resume uploaded</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-amber-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Resume required</span>
                            </div>
                        )}
                    </div>

                    {/* Active Assessments */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <h3 className="font-bold text-white mb-4">My Assessments</h3>
                        {mySubmissions.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-xs text-white/50 mb-3">No assessments yet</p>
                                <p className="text-xs text-white/40">Start an assessment to see it here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {mySubmissions
                                    .filter(s => s.status === 'pending' || s.status === 'submitted' || !s.status)
                                    .slice(0, 3)
                                    .map((submission) => {
                                        const getStatusColor = (status: string) => {
                                            if (status === 'evaluated' || status === 'shortlisted') return 'text-green-400'
                                            if (status === 'rejected') return 'text-red-400'
                                            return 'text-orange-400'
                                        }

                                        const getStatusText = (status: string) => {
                                            if (status === 'evaluated') return 'Evaluated'
                                            if (status === 'shortlisted') return 'Shortlisted'
                                            if (status === 'rejected') return 'Rejected'
                                            if (status === 'submitted') return 'Submitted'
                                            return 'Pending'
                                        }

                                        return (
                                            <div key={submission.id} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-sm font-semibold text-white truncate">
                                                        {submission.jobTitle || 'Assessment'}
                                                    </span>
                                                    <span className={`text-xs font-medium ${getStatusColor(submission.status || 'pending')}`}>
                                                        {getStatusText(submission.status || 'pending')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/50 mb-1">{submission.company}</p>
                                                {submission.scores?.percentage !== undefined && (
                                                    <p className="text-xs text-white/60 mb-3">
                                                        Score: {submission.scores.percentage}%
                                                    </p>
                                                )}
                                                {submission.status === 'pending' || submission.status === 'submitted' ? (
                                                    <Link href={`/test/${submission.jobId || submission.assessmentId}`}>
                                                        <Button size="sm" className="w-full text-xs h-8 bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                                            {submission.status === 'submitted' ? 'View Results' : 'Continue Assessment'}
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Link href="/candidate/achievements">
                                                        <Button size="sm" variant="outline" className="w-full text-xs h-8 border-white/10 text-white hover:bg-white/10">
                                                            View Results
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        )
                                    })}
                                {mySubmissions.filter(s => s.status === 'pending' || s.status === 'submitted' || !s.status).length === 0 && (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-white/50">All assessments completed</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
