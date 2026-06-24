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
                    const savedJobs = JSON.parse(localStorage.getItem('hirematrix_jobs') || '[]')
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
                const savedJobs = JSON.parse(localStorage.getItem('hirematrix_jobs') || '[]')
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

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              job.company.toLowerCase().includes(searchQuery.toLowerCase());
        const hasSubmitted = mySubmissions.some(sub => sub.jobId === job.id || sub.assessmentId === job.id);
        return matchesSearch && !hasSubmitted;
    })

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* ========== WELCOME & QUICK STATS ========== */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-[#13163a] rounded-xl border border-white/10 p-8 flex flex-col justify-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.user_metadata?.full_name || 'Candidate'}!</h1>
                    <p className="text-white/40 max-w-xl">Ready to showcase your skills? Check your pending assessments below or discover new opportunities.</p>
                </div>
                <div className="bg-[#13163a] rounded-xl border border-white/10 p-6 flex flex-col justify-center items-center">
                    <div className="flex justify-between items-center w-full mb-4">
                        <h3 className="font-bold text-white text-sm">Profile Strength</h3>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full capitalize">
                            {profileStrength.level}
                        </span>
                    </div>
                    <div className="w-full bg-[#0a0c27] rounded-full h-3 mb-2 border border-white/5">
                        <div
                            className="bg-primary h-3 rounded-full transition-all duration-300"
                            style={{ width: `${profileStrength.percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between w-full mt-2">
                        <span className="text-xs text-white/40">{profileStrength.percentage}% Complete</span>
                        {(!user?.email || !user?.user_metadata?.full_name) && (
                            <Link href="/candidate/profile" className="text-xs text-primary hover:underline">Update Profile</Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== MY ASSESSMENTS ========== */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">My Assessments</h2>
                    <Link href="/candidate/achievements" className="text-sm font-semibold text-primary hover:underline">View History</Link>
                </div>
                
                {mySubmissions.length === 0 ? (
                    <div className="bg-[#13163a] border border-white/10 rounded-lg p-12 text-center">
                        <div className="w-16 h-16 bg-[#0a0c27] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <Briefcase className="w-8 h-8 text-white/20" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No active assessments</h3>
                        <p className="text-white/40">Start an assessment from the opportunities below to see it here.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {mySubmissions.map((submission) => {
                            const getStatusColor = (status: string) => {
                                if (status === 'evaluated' || status === 'shortlisted') return 'text-green-400 bg-green-400/10 border-green-400/20'
                                if (status === 'rejected') return 'text-red-400 bg-red-400/10 border-red-400/20'
                                if (status === 'submitted') return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                                return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                            }

                            const getStatusText = (status: string) => {
                                if (status === 'evaluated') return 'Evaluated'
                                if (status === 'shortlisted') return 'Shortlisted'
                                if (status === 'rejected') return 'Not Selected'
                                if (status === 'submitted') return 'Under Review'
                                return 'Pending Completion'
                            }

                            return (
                                <div key={submission.id} className="bg-[#13163a] border border-white/10 rounded-lg p-6 hover:bg-white/[0.04] transition-colors flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{submission.jobTitle || 'Assessment'}</h3>
                                            <p className="text-sm text-white/40">{submission.company}</p>
                                        </div>
                                        <Badge variant="outline" className={`border ${getStatusColor(submission.status || 'pending')}`}>
                                            {getStatusText(submission.status || 'pending')}
                                        </Badge>
                                    </div>
                                    
                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40">Score</span>
                                            <span className="font-medium text-white">
                                                {submission.scores?.percentage !== undefined ? `${submission.scores.percentage}%` : '--'}
                                            </span>
                                        </div>
                                        
                                        {submission.status === 'pending' || !submission.status ? (
                                            <Link href={`/test/${submission.jobId || submission.assessmentId}`}>
                                                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                                    Continue Assessment
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Link href="/candidate/achievements">
                                                <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-[#0a0c27]">
                                                    View Details
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ========== AVAILABLE OPPORTUNITIES ========== */}
            <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Available Opportunities</h2>
                        <p className="text-sm text-white/40 mt-1">Discover and take assessments for active roles</p>
                    </div>
                    
                    <div className="flex items-center w-full md:w-72 relative">
                        <Search className="w-4 h-4 text-white/40 absolute left-3" />
                        <input
                            type="text"
                            placeholder="Search by title or company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-clean w-full pl-9 h-10"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="bg-[#13163a] border border-white/10 rounded-lg p-12 text-center">
                        <div className="w-16 h-16 bg-[#0a0c27] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <Search className="w-8 h-8 text-white/20" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No matching opportunities</h3>
                        <p className="text-white/40">Try adjusting your search terms or check back later.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredJobs.map((job) => {
                            const allSkills = [
                                ...(job.parsed_skills?.technical || []),
                                ...(job.parsed_skills?.tools || []),
                                ...(job.parsed_skills?.domain_knowledge || [])
                            ]
                            
                            return (
                                <div key={job.id} className="bg-[#13163a] border border-white/10 rounded-lg p-5 hover:bg-white/[0.04] transition-colors flex flex-col group">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-10 h-10 rounded bg-gradient-to-br from-[#E8C547] to-amber-600 flex items-center justify-center text-primary-foreground font-bold text-lg uppercase shadow-lg">
                                            {job.company.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-primary transition-colors text-base line-clamp-1" title={job.title}>{job.title}</h3>
                                            <p className="text-xs text-white/60">{job.company}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-xs text-white/40 mb-4 bg-[#0a0c27] p-2 rounded border border-white/5">
                                        <span className="flex items-center gap-1.5" title="Duration">
                                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                                            {job.config?.duration_minutes || 60}m
                                        </span>
                                        <div className="w-px h-3 bg-white/10" />
                                        <span className="flex items-center gap-1.5" title="Posted">
                                            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                                            {job.posted}
                                        </span>
                                    </div>

                                    <div className="mt-auto pt-4">
                                        <Link href={`/test/${job.id}`}>
                                            <Button className="w-full bg-white/5 hover:bg-primary hover:text-primary-foreground text-white border border-white/10 hover:border-transparent transition-all">
                                                Take Assessment
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
