"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Users, FileText, Clock, MoreHorizontal, ArrowUpRight, Search, Filter, Link as LinkIcon, Copy, Check, Edit, Trash2, Eye, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { getSubmissionStats, getSubmissionsByJob } from "@/lib/submissionService"
import { getJobsByRecruiter, deleteJob } from "@/lib/jobService"

interface Job {
    id: string
    title: string
    company: string
    status: 'draft' | 'active' | 'closed'
    createdAt: string
    candidatesCount: number
    questionsCount: number
}

export default function RecruiterDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    useEffect(() => {
        const loadJobs = async () => {
            if (!user?.id) {
                setLoading(false)
                return
            }

            try {
                const supabaseJobs = await getJobsByRecruiter(user.id)

                if (supabaseJobs && supabaseJobs.length > 0) {
                    const formattedJobs = supabaseJobs.map((job: any) => ({
                        id: job.id,
                        title: job.title,
                        company: job.company,
                        status: job.status || (job.is_active ? 'active' : 'draft'),
                        createdAt: job.created_at || job.createdAt,
                        candidatesCount: job.candidatesCount || 0,
                        questionsCount: job.questionsCount || 0
                    }))
                    setJobs(formattedJobs)
                } else {
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const migratedJobs = await Promise.all(savedJobs.map(async (job: any) => {
                        const submissions = await getSubmissionsByJob(job.id)
                        return {
                            ...job,
                            status: job.status || 'draft',
                            candidatesCount: submissions.length,
                            questionsCount: job.questionsCount || (job.questions?.length || 0),
                            createdAt: job.createdAt || job.created_at || new Date().toISOString()
                        }
                    }))
                    setJobs(migratedJobs)
                }
            } catch (error) {
                console.error('Error loading jobs:', error)
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const migratedJobs = await Promise.all(savedJobs.map(async (job: any) => {
                    const submissions = await getSubmissionsByJob(job.id)
                    return {
                        ...job,
                        status: job.status || 'draft',
                        candidatesCount: submissions.length,
                        questionsCount: job.questionsCount || (job.questions?.length || 0),
                        createdAt: job.createdAt || job.created_at || new Date().toISOString()
                    }
                }))
                setJobs(migratedJobs)
            } finally {
                setLoading(false)
            }
        }

        loadJobs()

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'recruiter_submissions' || e.key === 'assessai_jobs') {
                loadJobs()
            }
        }

        window.addEventListener('storage', handleStorageChange)

        const handleCustomStorage = () => {
            loadJobs()
        }
        window.addEventListener('submissionUpdated', handleCustomStorage)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('submissionUpdated', handleCustomStorage)
        }
    }, [user])

    const [submissionStats, setSubmissionStats] = useState({ total: 0, averageScore: 0 })

    useEffect(() => {
        const loadStats = async () => {
            const stats = await getSubmissionStats()
            setSubmissionStats(stats)
        }
        loadStats()
    }, [])

    const stats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => (j.status || 'draft') === 'active').length,
        totalCandidates: submissionStats.total || jobs.reduce((sum, j) => sum + (j.candidatesCount || 0), 0),
        avgTime: submissionStats.averageScore ? Math.round(submissionStats.averageScore) : 45
    }

    const copyAssessmentLink = (jobId: string) => {
        const link = `${window.location.origin}/test/${jobId}`
        navigator.clipboard.writeText(link)
        setCopiedId(jobId)
        toast.success('Assessment link copied to clipboard!')
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleEditAssessment = (jobId: string) => {
        router.push(`/recruiter/jobs/${jobId}/edit`)
    }

    const handleViewAssessment = (jobId: string) => {
        router.push(`/recruiter/jobs/${jobId}/leaderboard`)
    }

    const handleDeleteAssessment = async (jobId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return
        }

        try {
            // Delete from Supabase first
            const deleted = await deleteJob(jobId)
            
            if (!deleted) {
                // If Supabase delete fails, try localStorage as fallback
                console.warn('Supabase delete failed, trying localStorage fallback')
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const updatedJobs = savedJobs.filter((job: any) => job.id !== jobId)
                localStorage.setItem('assessai_jobs', JSON.stringify(updatedJobs))
            } else {
                // Also clean up localStorage if it exists
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const updatedJobs = savedJobs.filter((job: any) => job.id !== jobId)
                localStorage.setItem('assessai_jobs', JSON.stringify(updatedJobs))
            }

            // Reload jobs from Supabase
            const supabaseJobs = await getJobsByRecruiter(user?.id || '')
            if (supabaseJobs && supabaseJobs.length > 0) {
                const formattedJobs = supabaseJobs.map((job: any) => ({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    status: job.status || (job.is_active ? 'active' : 'draft'),
                    createdAt: job.created_at || job.createdAt,
                    candidatesCount: job.candidatesCount || 0,
                    questionsCount: job.questionsCount || 0
                }))
                setJobs(formattedJobs)
            } else {
                // Fallback to localStorage
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const migratedJobs = await Promise.all(savedJobs.map(async (job: any) => {
                    const submissions = await getSubmissionsByJob(job.id)
                    return {
                        ...job,
                        status: job.status || 'draft',
                        candidatesCount: submissions.length,
                        questionsCount: job.questionsCount || (job.questions?.length || 0),
                        createdAt: job.createdAt || job.created_at || new Date().toISOString()
                    }
                }))
                setJobs(migratedJobs)
            }

            toast.success('Assessment deleted successfully')
        } catch (error) {
            console.error('Error deleting assessment:', error)
            toast.error('Failed to delete assessment. Please try again.')
        }
    }

    const filteredJobs = useMemo(() => {
        let filtered = [...jobs]

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(job =>
                job.title.toLowerCase().includes(query) ||
                job.company.toLowerCase().includes(query)
            )
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(job => (job.status || 'draft') === statusFilter)
        }

        return filtered
    }, [jobs, searchQuery, statusFilter])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* ========== HEADER ========== */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                    <p className="text-white/40">Welcome back, {user?.email?.split('@')[0]}</p>
                </div>
                <Link href="/recruiter/jobs/new">
                    <Button className="bg-white text-black hover:bg-white/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Assessment
                    </Button>
                </Link>
            </div>

            {/* ========== STATS ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Assessments", value: stats.totalJobs, icon: FileText, change: "+2 this week" },
                    { label: "Active Campaigns", value: stats.activeJobs, icon: Users, change: "Stable" },
                    { label: "Total Candidates", value: stats.totalCandidates, icon: Users, change: "+12% vs last month" },
                    { label: "Avg. Completion Time", value: `${stats.avgTime}m`, icon: Clock, change: "-5%" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.07] transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <span className="p-2 bg-white/10 text-white rounded-lg">
                                <stat.icon className="w-4 h-4" />
                            </span>
                            {i === 2 ? (
                                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">{stat.change}</span>
                            ) : (
                                <span className="text-xs text-white/30">{stat.change}</span>
                            )}
                        </div>
                        <div className="text-2xl font-semibold text-white">{stat.value}</div>
                        <div className="text-sm text-white/40">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* ========== RECENT JOBS ========== */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-white">Recent Assessments</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                placeholder="Search assessments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 h-9 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/20 text-white placeholder:text-white/30 w-64"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] h-9 bg-white/5 border-white/10 text-white [&>span]:text-white">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Filter by status" className="text-white" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-white/10">
                                <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">All Status</SelectItem>
                                <SelectItem value="active" className="text-white focus:bg-white/10 focus:text-white">Active</SelectItem>
                                <SelectItem value="draft" className="text-white focus:bg-white/10 focus:text-white">Draft</SelectItem>
                                <SelectItem value="closed" className="text-white focus:bg-white/10 focus:text-white">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {filteredJobs.length === 0 && jobs.length > 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-white/20" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No assessments found</h3>
                        <p className="text-white/40 mb-6">Try adjusting your search or filter criteria.</p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery("")
                                setStatusFilter("all")
                            }}
                            className="border-white/10 text-white hover:bg-white/10"
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-white/20" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No assessments yet</h3>
                        <p className="text-white/40 mb-6">Get started by creating your first job assessment.</p>
                        <Link href="/recruiter/jobs/new">
                            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
                                Create Assessment
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-white/40 font-medium border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4">Assessment Title</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Candidates</th>
                                    <th className="px-6 py-4">Created</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredJobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{job.title}</div>
                                            <div className="text-xs text-white/40">{job.company}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(job.status || 'draft') === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-white/10 text-white/60 border border-white/10'
                                                }`}>
                                                {(job.status || 'draft').charAt(0).toUpperCase() + (job.status || 'draft').slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-white/60">
                                                <Users className="w-4 h-4 text-white/30" />
                                                <span>{job.candidatesCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white/40">
                                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() :
                                                job.created_at ? new Date(job.created_at).toLocaleDateString() :
                                                    'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyAssessmentLink(job.id)}
                                                    className="h-8 bg-transparent border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                                                >
                                                    {copiedId === job.id ? (
                                                        <>
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LinkIcon className="w-3 h-3 mr-1" />
                                                            Copy Link
                                                        </>
                                                    )}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-white/10">
                                                        <DropdownMenuLabel className="text-white/60">Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem onClick={() => handleViewAssessment(job.id)} className="text-white/80 focus:bg-white/10 focus:text-white">
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditAssessment(job.id)} className="text-white/80 focus:bg-white/10 focus:text-white">
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit Assessment
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => copyAssessmentLink(job.id)} className="text-white/80 focus:bg-white/10 focus:text-white">
                                                            <LinkIcon className="w-4 h-4 mr-2" />
                                                            Copy Link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteAssessment(job.id, job.title)}
                                                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
