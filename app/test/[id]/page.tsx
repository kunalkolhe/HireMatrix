"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, FileText, Code, MessageSquare, CheckCircle2, Shield, ArrowRight, Brain, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Job {
    id: string
    title: string
    company: string
    description: string
    parsed_skills?: {
        technical: string[]
        soft: string[]
        tools: string[]
        domain_knowledge: string[]
    }
    experience_level?: string
    config?: {
        duration_minutes: number
        passing_percentage: number
    }
    questions?: any[]
}

export default function AssessmentLinkPage() {
    const params = useParams()
    const router = useRouter()
    const assessmentId = params.id as string
    const { user, loading: authLoading } = useAuth()
    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasResume, setHasResume] = useState<boolean | null>(null)
    const [checkingResume, setCheckingResume] = useState(true)

    useEffect(() => {
        const checkResume = async () => {
            if (!user?.id) {
                setHasResume(null)
                setCheckingResume(false)
                return
            }

            try {
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('has_resume')
                    .eq('id', user.id)
                    .maybeSingle()

                setHasResume(profile?.has_resume === true)
            } catch (error) {
                console.error('Error checking resume:', error)
                setHasResume(false)
            } finally {
                setCheckingResume(false)
            }
        }

        checkResume()
    }, [user])

    useEffect(() => {
        const loadJob = async () => {
            try {
                const { getJobById } = await import('@/lib/jobService')
                const supabaseJob = await getJobById(assessmentId)

                if (supabaseJob) {
                    const formattedJob: Job = {
                        id: supabaseJob.id,
                        title: supabaseJob.title,
                        company: supabaseJob.company || '',
                        description: supabaseJob.description || '',
                        parsed_skills: supabaseJob.parsed_skills || { technical: [], soft: [], tools: [], domain_knowledge: [] },
                        experience_level: supabaseJob.experience_level || 'fresher',
                        config: supabaseJob.assessment?.config || {
                            mcq_count: 10,
                            mcq_weightage: 30,
                            subjective_count: 3,
                            subjective_weightage: 30,
                            coding_count: 2,
                            coding_weightage: 40,
                            duration_minutes: 60,
                            passing_percentage: 50
                        },
                        questions: supabaseJob.questions || [],
                        status: supabaseJob.status || 'active'
                    }
                    setJob(formattedJob)
                } else {
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const foundJob = savedJobs.find((j: Job) => j.id === assessmentId)
                    if (foundJob) {
                        setJob(foundJob)
                    }
                }
            } catch (error) {
                console.error('Error loading job:', error)
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const foundJob = savedJobs.find((j: Job) => j.id === assessmentId)
                if (foundJob) {
                    setJob(foundJob)
                }
            } finally {
                setLoading(false)
            }
        }

        loadJob()
    }, [assessmentId])

    const handleStart = () => {
        if (user && user.email && (user.user_metadata?.full_name || user.user_metadata?.name)) {
            const candidateInfo = {
                name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                email: user.email,
                assessmentId,
                startedAt: new Date().toISOString(),
                userId: user.id
            }
            sessionStorage.setItem(`candidate_info_${assessmentId}`, JSON.stringify(candidateInfo))
            router.push(`/test/${assessmentId}/assessment`)
        } else {
            router.push(`/test/${assessmentId}/info`)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8C547] border-t-transparent" />
            </div>
        )
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-lg p-8">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Assessment Not Found</h2>
                    <p className="text-white/60">The assessment link you're looking for doesn't exist or has expired.</p>
                </div>
            </div>
        )
    }

    const allSkills = [
        ...(job.parsed_skills?.technical || []),
        ...(job.parsed_skills?.tools || []),
        ...(job.parsed_skills?.domain_knowledge || [])
    ]

    const duration = job.config?.duration_minutes || 60
    const questionCount = job.questions?.length || 0
    const mcqCount = job.questions?.filter(q => q.type === 'mcq').length || 0
    const subjectiveCount = job.questions?.filter(q => q.type === 'subjective').length || 0
    const codingCount = job.questions?.filter(q => q.type === 'coding').length || 0

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-4">
                        <Brain className="w-5 h-5 text-[#E8C547]" />
                        <span className="font-semibold text-white">AssessAI Assessment</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">{job.title}</h1>
                    <p className="text-xl text-white/60">{job.company}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Assessment Overview */}
                    <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-lg p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <FileText className="w-5 h-5 text-[#E8C547]" />
                            Assessment Overview
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-white/70">
                                <Clock className="w-5 h-5 text-white/40" />
                                <div>
                                    <div className="font-semibold text-white">Duration</div>
                                    <div className="text-sm text-white/50">{duration} minutes</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-white/70">
                                <FileText className="w-5 h-5 text-white/40" />
                                <div>
                                    <div className="font-semibold text-white">Total Questions</div>
                                    <div className="text-sm text-white/50">{questionCount} questions</div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <div className="text-sm font-semibold text-white/70 mb-2">Question Breakdown:</div>
                                <div className="flex flex-wrap gap-2">
                                    {mcqCount > 0 && (
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                            {mcqCount} MCQs
                                        </Badge>
                                    )}
                                    {subjectiveCount > 0 && (
                                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                            {subjectiveCount} Subjective
                                        </Badge>
                                    )}
                                    {codingCount > 0 && (
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                                            {codingCount} Coding
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skills Being Evaluated */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <Code className="w-5 h-5 text-[#E8C547]" />
                            Skills Evaluated
                        </h3>
                        {allSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {allSkills.slice(0, 10).map((skill, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs border-white/10 text-white/60">
                                        {skill}
                                    </Badge>
                                ))}
                                {allSkills.length > 10 && (
                                    <Badge variant="outline" className="text-xs border-white/10 text-white/40">
                                        +{allSkills.length - 10} more
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-white/50">Skills will be evaluated based on your responses.</p>
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                        <CheckCircle2 className="w-5 h-5 text-[#E8C547]" />
                        Instructions
                    </h3>
                    <ul className="space-y-3 text-white/70">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-white">No Signup Required</div>
                                <div className="text-sm text-white/50">Just provide your name, email, and resume to get started.</div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-white">Sequential Sections</div>
                                <div className="text-sm text-white/50">Complete MCQs first, then subjective questions, and finally coding challenges.</div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-white">Auto-Save</div>
                                <div className="text-sm text-white/50">Your answers are automatically saved as you progress.</div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-white">Time Limit</div>
                                <div className="text-sm text-white/50">You have {duration} minutes to complete the assessment. Timer starts when you begin.</div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-white">Fair Assessment</div>
                                <div className="text-sm text-white/50">The system monitors assessment integrity to ensure fairness for all candidates.</div>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Anti-Cheat Instructions */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 mb-8">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-amber-400 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        Important: Assessment Security Rules
                    </h3>
                    <p className="text-amber-200/70 text-sm mb-4">
                        Please read these rules carefully. Violations will result in automatic submission.
                    </p>
                    <ul className="space-y-3 text-white/80">
                        <li className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-amber-200">Fullscreen Mode Required</div>
                                <div className="text-sm text-white/60">
                                    The assessment will automatically enter fullscreen mode when you start.
                                    <strong className="text-amber-300"> If you exit fullscreen mode, your assessment will be automatically submitted.</strong>
                                </div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-amber-200">Tab Switching Policy</div>
                                <div className="text-sm text-white/60">
                                    <strong className="text-amber-300">First tab switch:</strong> You will receive a warning.
                                    <strong className="text-amber-300"> Second tab switch:</strong> Your assessment will be automatically submitted.
                                </div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-amber-200">Copy/Paste Disabled</div>
                                <div className="text-sm text-white/60">
                                    Right-click context menu, copy (Ctrl+C/Cmd+C), paste (Ctrl+V/Cmd+V), and cut (Ctrl+X/Cmd+X) shortcuts are disabled during the assessment.
                                </div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-amber-200">Developer Tools Blocked</div>
                                <div className="text-sm text-white/60">
                                    Keyboard shortcuts for developer tools (F12, Ctrl+Shift+I, etc.) and other restricted shortcuts are disabled.
                                </div>
                            </div>
                        </li>
                        <li className="flex items-start gap-3 pt-2 border-t border-amber-500/20">
                            <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-amber-200">All Activities Monitored</div>
                                <div className="text-sm text-white/60">
                                    The system tracks all activities including tab switches, copy/paste attempts, and time spent on each question to ensure assessment integrity.
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Resume Warning for Logged-in Users Without Resume */}
                {user?.id && hasResume === false && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 mb-8">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="font-semibold text-amber-200 mb-1">Resume Not Uploaded</div>
                                <div className="text-sm text-white/60 mb-3">
                                    You haven't uploaded your resume yet. Without a resume, the system cannot extract your skills, which may result in lower assessment scores. We recommend uploading your resume to get the best results.
                                </div>
                                <Button
                                    onClick={() => router.push('/candidate/resume')}
                                    variant="outline"
                                    className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                                >
                                    Upload Resume
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="text-center">
                    <Button
                        onClick={handleStart}
                        size="lg"
                        className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black px-8 py-6 text-lg"
                    >
                        Start Assessment
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <p className="text-sm text-white/40 mt-4">No account creation required • Takes about {duration} minutes</p>
                </div>
            </div>
        </div>
    )
}
