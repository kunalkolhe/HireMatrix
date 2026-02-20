"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
    Clock,
    FileText,
    Code,
    MessageSquare,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Send,
    Shield,
    AlertCircle
} from "lucide-react"
import dynamic from "next/dynamic"
import { useAuth } from "@/contexts/AuthContext"

const MonacoEditor = dynamic(
    () => import("@monaco-editor/react").then((mod) => mod.default),
    { ssr: false, loading: () => <div className="h-96 bg-slate-900/50 animate-pulse rounded-xl" /> }
)

type Section = 'mcq' | 'subjective' | 'coding'
type QuestionType = 'mcq' | 'subjective' | 'coding'

interface Question {
    id: string
    type: QuestionType
    difficulty: string
    skill_tags: string[]
    marks: number
    content: any
    order: number
}

interface Job {
    id: string
    title: string
    company: string
    config?: {
        duration_minutes: number
        passing_percentage: number
    }
    questions?: Question[]
}

interface Answer {
    question_id: string
    question_type: string
    response: any
    time_spent_seconds: number
}

interface AntiCheatData {
    tab_switches: number
    copy_paste_detected: boolean
    time_anomalies: boolean
    question_times: Record<string, number>
    suspicious_patterns: string[]
}

export default function SequentialAssessmentPage() {
    const params = useParams()
    const router = useRouter()
    const assessmentId = params.id as string
    const { user } = useAuth()

    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [currentSection, setCurrentSection] = useState<Section>('mcq')
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, Answer>>({})
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
    const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const fullscreenExitCountRef = useRef(0)

    // Anti-cheat tracking (silent)
    const [antiCheatData, setAntiCheatData] = useState<AntiCheatData>({
        tab_switches: 0,
        copy_paste_detected: false,
        time_anomalies: false,
        question_times: {},
        suspicious_patterns: []
    })
    const antiCheatRef = useRef<AntiCheatData>(antiCheatData)
    const assessmentStartedRef = useRef(false)
    const handleSubmitRef = useRef<(() => Promise<void>) | null>(null)

    // Load job and candidate info
    useEffect(() => {
        const loadJob = async () => {
            try {
                // Try Supabase first
                const { getJobById } = await import('@/lib/jobService')
                const supabaseJob = await getJobById(assessmentId)

                if (supabaseJob) {
                    // Format job for component
                    const formattedJob: any = {
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
                        status: supabaseJob.status || 'active',
                        assessmentId: supabaseJob.assessment?.id || assessmentId // Store actual assessment ID
                    }
                    setJob(formattedJob)
                    setTimeRemaining((formattedJob.config?.duration_minutes || 60) * 60)
                } else {
                    // Fallback to localStorage
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const foundJob = savedJobs.find((j: Job) => j.id === assessmentId)

                    if (foundJob) {
                        setJob(foundJob)
                        setTimeRemaining((foundJob.config?.duration_minutes || 60) * 60)
                    }
                }
            } catch (error) {
                console.error('Error loading job:', error)
                // Fallback to localStorage
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const foundJob = savedJobs.find((j: Job) => j.id === assessmentId)

                if (foundJob) {
                    setJob(foundJob)
                    setTimeRemaining((foundJob.config?.duration_minutes || 60) * 60)
                }
            }
        }

        loadJob()

        // Check if candidate info exists
        const candidateInfo = sessionStorage.getItem(`candidate_info_${assessmentId}`)

        // If no candidate info and user is logged in, auto-create it
        if (!candidateInfo && user) {
            const autoCandidateInfo = {
                name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                assessmentId,
                startedAt: new Date().toISOString(),
                userId: user.id
            }
            sessionStorage.setItem(`candidate_info_${assessmentId}`, JSON.stringify(autoCandidateInfo))
        } else if (!candidateInfo && !user) {
            // Not logged in and no info, redirect to info page
            router.push(`/test/${assessmentId}/info`)
            return
        }

        setLoading(false)
    }, [assessmentId, router, user])

    // Enter fullscreen mode when assessment starts
    useEffect(() => {
        if (loading || submitted || !job || assessmentStartedRef.current) return

        const enterFullscreen = async () => {
            try {
                const element = document.documentElement
                if (element.requestFullscreen) {
                    await element.requestFullscreen()
                    setIsFullscreen(true)
                    assessmentStartedRef.current = true
                } else if ((element as any).webkitRequestFullscreen) {
                    await (element as any).webkitRequestFullscreen()
                    setIsFullscreen(true)
                    assessmentStartedRef.current = true
                } else if ((element as any).mozRequestFullScreen) {
                    await (element as any).mozRequestFullScreen()
                    setIsFullscreen(true)
                    assessmentStartedRef.current = true
                } else if ((element as any).msRequestFullscreen) {
                    await (element as any).msRequestFullscreen()
                    setIsFullscreen(true)
                    assessmentStartedRef.current = true
                }
            } catch (error) {
                console.error('Error entering fullscreen:', error)
                // Continue even if fullscreen fails
                assessmentStartedRef.current = true
            }
        }

        enterFullscreen()
    }, [loading, submitted, job])

    // Monitor fullscreen exit with warning and auto-submit
    useEffect(() => {
        if (submitted) return

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            )

            if (!isCurrentlyFullscreen && isFullscreen && assessmentStartedRef.current) {
                // Fullscreen was exited
                fullscreenExitCountRef.current += 1
                
                // First exit: show warning and flag
                if (fullscreenExitCountRef.current === 1) {
                    console.warn('Fullscreen exited - first warning')
                    setShowFullscreenWarning(true)
                    
                    // Update anti-cheat data to flag this
                    setAntiCheatData(prev => {
                        const updated = {
                            ...prev,
                            suspicious_patterns: [...prev.suspicious_patterns, 'Fullscreen exit detected']
                        }
                        antiCheatRef.current = updated
                        return updated
                    })
                    
                    // Try to re-enter fullscreen
                    setTimeout(async () => {
                        try {
                            const element = document.documentElement
                            if (element.requestFullscreen) {
                                await element.requestFullscreen()
                            } else if ((element as any).webkitRequestFullscreen) {
                                await (element as any).webkitRequestFullscreen()
                            } else if ((element as any).mozRequestFullScreen) {
                                await (element as any).mozRequestFullScreen()
                            } else if ((element as any).msRequestFullscreen) {
                                await (element as any).msRequestFullscreen()
                            }
                        } catch (error) {
                            console.warn('Could not re-enter fullscreen:', error)
                        }
                    }, 100)
                }
                // Second exit: auto-submit and flag
                else if (fullscreenExitCountRef.current >= 2) {
                    console.warn('Fullscreen exited multiple times - auto-submitting assessment')
                    
                    // Flag as suspicious
                    setAntiCheatData(prev => {
                        const updated = {
                            ...prev,
                            suspicious_patterns: [...prev.suspicious_patterns, 'Multiple fullscreen exits detected']
                        }
                        antiCheatRef.current = updated
                        return updated
                    })
                    
                    if (handleSubmitRef.current) {
                        handleSubmitRef.current()
                    }
                }
            }
            setIsFullscreen(isCurrentlyFullscreen)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
        document.addEventListener('mozfullscreenchange', handleFullscreenChange)
        document.addEventListener('MSFullscreenChange', handleFullscreenChange)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
        }
    }, [submitted, isFullscreen])

    // Timer
    useEffect(() => {
        if (submitted || timeRemaining <= 0) return

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    if (handleSubmitRef.current) {
                        handleSubmitRef.current()
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [submitted, timeRemaining])

    // Anti-cheat: Tab switch detection with warning and auto-submit
    useEffect(() => {
        if (submitted) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                const newTabSwitches = antiCheatRef.current.tab_switches + 1

                setAntiCheatData(prev => {
                    const updated = {
                        ...prev,
                        tab_switches: newTabSwitches
                    }
                    antiCheatRef.current = updated
                    return updated
                })

                // First tab switch: show warning
                if (newTabSwitches === 1) {
                    setShowTabSwitchWarning(true)
                    setTimeout(() => setShowTabSwitchWarning(false), 5000)
                }
                // Second tab switch: auto-submit
                else if (newTabSwitches >= 2) {
                    console.warn('Multiple tab switches detected - auto-submitting assessment')
                    if (handleSubmitRef.current) {
                        handleSubmitRef.current()
                    }
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [submitted])

    // Anti-cheat: Disable copy-paste and right-click
    useEffect(() => {
        if (submitted) return

        // Block paste events
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setAntiCheatData(prev => {
                const updated = {
                    ...prev,
                    copy_paste_detected: true
                }
                antiCheatRef.current = updated
                return updated
            })
        }

        // Block copy events
        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
        }

        // Block cut events
        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
        }

        // Block right-click context menu
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            return false
        }

        // Block keyboard shortcuts (but allow normal typing)
        const handleKeyDown = (e: KeyboardEvent) => {
            // IMPORTANT: Only block if Ctrl or Cmd (Meta) is pressed
            // If neither is pressed, allow all keys (normal typing)
            const isModifierPressed = e.ctrlKey || e.metaKey
            
            // Block function keys regardless of modifiers
            const blockedFunctionKeys = ['F12', 'F5', 'F11']
            if (blockedFunctionKeys.includes(e.key)) {
                e.preventDefault()
                e.stopPropagation()
                return false
            }

            // If no modifier is pressed, allow everything (normal typing)
            if (!isModifierPressed) {
                return true // Allow normal key presses
            }

            // Only check for blocked shortcuts when Ctrl/Cmd is pressed
            const keyLower = e.key.toLowerCase()
            
            // Block specific Ctrl/Cmd combinations
            if (isModifierPressed && !e.shiftKey) {
                // Block Ctrl/Cmd + key (without Shift)
                const blockedKeys = ['c', 'v', 'x', 'a', 'p', 's', 'u']
                if (blockedKeys.includes(keyLower)) {
                    e.preventDefault()
                    e.stopPropagation()
                    return false
                }
            }

            // Block Ctrl/Cmd + Shift combinations for dev tools
            if (isModifierPressed && e.shiftKey) {
                const blockedShiftKeys = ['i', 'j', 'c']
                if (blockedShiftKeys.includes(keyLower)) {
                    e.preventDefault()
                    e.stopPropagation()
                    return false
                }
            }

            // Allow all other combinations (including Ctrl+Shift+letter for special characters)
            return true
        }

        // Block text selection (optional - can be too restrictive)
        const handleSelectStart = (e: Event) => {
            // Allow selection for typing, but prevent programmatic selection
            // We'll be more lenient here
        }

        document.addEventListener('paste', handlePaste, true)
        document.addEventListener('copy', handleCopy, true)
        document.addEventListener('cut', handleCut, true)
        document.addEventListener('contextmenu', handleContextMenu, true)
        document.addEventListener('keydown', handleKeyDown, true)
        document.addEventListener('selectstart', handleSelectStart, true)

        return () => {
            document.removeEventListener('paste', handlePaste, true)
            document.removeEventListener('copy', handleCopy, true)
            document.removeEventListener('cut', handleCut, true)
            document.removeEventListener('contextmenu', handleContextMenu, true)
            document.removeEventListener('keydown', handleKeyDown, true)
            document.removeEventListener('selectstart', handleSelectStart, true)
        }
    }, [submitted])

    // Track time per question
    useEffect(() => {
        if (submitted) return

        const questionId = getCurrentQuestion()?.id
        if (!questionId) return

        const interval = setInterval(() => {
            const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
            setAntiCheatData(prev => ({
                ...prev,
                question_times: {
                    ...prev.question_times,
                    [questionId]: timeSpent
                }
            }))
        }, 1000)

        return () => clearInterval(interval)
    }, [questionStartTime, submitted, currentSection, currentQuestionIndex])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const getQuestionsBySection = (section: Section): Question[] => {
        if (!job?.questions) return []
        return job.questions
            .filter(q => q.type === section)
            .sort((a, b) => a.order - b.order)
    }

    const getCurrentQuestion = (): Question | null => {
        const sectionQuestions = getQuestionsBySection(currentSection)
        return sectionQuestions[currentQuestionIndex] || null
    }

    const getSectionProgress = (section: Section) => {
        const sectionQuestions = getQuestionsBySection(section)
        const answered = sectionQuestions.filter(q => answers[q.id]).length
        return { answered, total: sectionQuestions.length }
    }

    const updateAnswer = useCallback((questionId: string, response: any) => {
        const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)

        setAnswers((prev) => {
            const updatedAnswers = {
                ...prev,
                [questionId]: {
                    question_id: questionId,
                    question_type: getCurrentQuestion()?.type || 'mcq',
                    response,
                    time_spent_seconds: (prev[questionId]?.time_spent_seconds || 0) + timeSpent
                }
            }

            // Auto-save to sessionStorage
            sessionStorage.setItem(`assessment_answers_${assessmentId}`, JSON.stringify(updatedAnswers))

            return updatedAnswers
        })
    }, [questionStartTime, assessmentId])

    const handleNext = () => {
        const sectionQuestions = getQuestionsBySection(currentSection)

        if (currentQuestionIndex < sectionQuestions.length - 1) {
            setQuestionStartTime(Date.now())
            setCurrentQuestionIndex(currentQuestionIndex + 1)
        } else {
            // Move to next section
            if (currentSection === 'mcq') {
                setCurrentSection('subjective')
                setCurrentQuestionIndex(0)
            } else if (currentSection === 'subjective') {
                setCurrentSection('coding')
                setCurrentQuestionIndex(0)
            }
            setQuestionStartTime(Date.now())
        }
    }

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setQuestionStartTime(Date.now())
            setCurrentQuestionIndex(currentQuestionIndex - 1)
        } else {
            // Move to previous section
            if (currentSection === 'subjective') {
                setCurrentSection('mcq')
                const mcqQuestions = getQuestionsBySection('mcq')
                setCurrentQuestionIndex(mcqQuestions.length - 1)
            } else if (currentSection === 'coding') {
                setCurrentSection('subjective')
                const subjQuestions = getQuestionsBySection('subjective')
                setCurrentQuestionIndex(subjQuestions.length - 1)
            }
            setQuestionStartTime(Date.now())
        }
    }

    const handleSubmit = useCallback(async () => {
        if (submitted) return // Prevent multiple submissions

        // Save final answers and anti-cheat data
        const candidateInfo = JSON.parse(sessionStorage.getItem(`candidate_info_${assessmentId}`) || '{}')

        // Use the actual assessment ID from the job if available, otherwise use the job ID
        // The submission service will look up the assessment ID if needed
        const actualAssessmentId = (job as any)?.assessmentId || assessmentId

        const submissionData = {
            assessmentId: actualAssessmentId,
            candidateInfo,
            answers,
            antiCheatData: antiCheatRef.current,
            submittedAt: new Date().toISOString(),
            job: {
                ...job,
                id: job?.id || assessmentId,
                assessmentId: actualAssessmentId // Include assessment ID in job object for lookup
            }
        }

        // Save to sessionStorage (for candidate reference)
        sessionStorage.setItem(`submission_${assessmentId}`, JSON.stringify(submissionData))

        // Save to recruiter-accessible storage and evaluate
        try {
            const { saveSubmission } = await import('@/lib/submissionService')
            const { evaluateAndSaveSubmission } = await import('@/lib/evaluationService')

            // Validate submission data before saving
            if (!submissionData.candidateInfo?.name || !submissionData.candidateInfo?.email) {
                console.error('Missing candidate info:', submissionData.candidateInfo)
                throw new Error('Missing candidate information')
            }

            if (!submissionData.job?.id || !submissionData.job?.title) {
                console.error('Missing job info:', submissionData.job)
                throw new Error('Missing job information')
            }

            // Save submission (now async with Supabase support)
            const submission = await saveSubmission(submissionData as any)
            console.log('Submission saved:', submission.id)

            // Evaluate and calculate scores
            if (job?.questions && Array.isArray(job.questions) && job.questions.length > 0) {
                console.log('Evaluating submission with', job.questions.length, 'questions')
                console.log('Submission answers:', Object.keys(submission.answers || {}).length, 'answers found')
                console.log('Answer types:', Object.values(submission.answers || {}).map((a: any) => a.question_type))

                // Get passing percentage from job config or assessment
                const passingPercentage = (job as any)?.assessment?.passing_percentage ||
                    (job as any)?.config?.passing_percentage ||
                    50
                console.log('Passing threshold:', passingPercentage + '%')

                await evaluateAndSaveSubmission(submission, job.questions as any, passingPercentage)
                console.log('Evaluation complete')

                // Run plagiarism and bot detection
                try {
                    const { checkSubmissionPlagiarism } = await import('@/lib/plagiarismDetection')
                    const { detectBotActivity } = await import('@/lib/botDetection')
                    const { updateSubmissionPlagiarism, updateSubmissionBotDetection } = require('@/lib/submissionService')

                    // Check plagiarism
                    const plagiarismResults = await checkSubmissionPlagiarism(submission, job.questions)
                    const hasPlagiarism = Object.values(plagiarismResults).some(r => r.flagged)

                    if (hasPlagiarism) {
                        updateSubmissionPlagiarism(submission.id, plagiarismResults)
                        console.log('Plagiarism detected')
                    }

                    // Detect bot activity
                    const botDetection = await detectBotActivity(submission, job.questions)
                    if (botDetection.isBot || botDetection.riskScore >= 50) {
                        updateSubmissionBotDetection(submission.id, botDetection)
                        console.log('Bot activity detected', botDetection)
                    }
                } catch (error) {
                    console.error('Error in plagiarism/bot detection:', error)
                    // Don't fail submission if detection fails
                }
            } else {
                console.warn('No questions available for evaluation')
            }
        } catch (error) {
            console.error('Error saving submission:', error)
            // Still redirect even if save fails (candidate shouldn't see error)
        }

        // Exit fullscreen mode before redirecting
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen()
            } else if ((document as any).webkitFullscreenElement) {
                await (document as any).webkitExitFullscreen()
            } else if ((document as any).mozFullScreenElement) {
                await (document as any).mozCancelFullScreen()
            } else if ((document as any).msFullscreenElement) {
                await (document as any).msExitFullscreen()
            }
        } catch (error) {
            console.warn('Error exiting fullscreen:', error)
            // Continue even if exit fails
        }

        // Mark as submitted and redirect
        setSubmitted(true)
        router.push(`/test/${assessmentId}/submitted`)
    }, [submitted, assessmentId, answers, job, router])

    // Store handleSubmit in ref for use in useEffect hooks
    useEffect(() => {
        handleSubmitRef.current = handleSubmit
    }, [handleSubmit])

    const canProceedToNextSection = () => {
        const sectionQuestions = getQuestionsBySection(currentSection)
        return currentQuestionIndex === sectionQuestions.length - 1
    }

    const canSubmit = () => {
        return currentSection === 'coding' && canProceedToNextSection()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
            </div>
        )
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Assessment Not Found</h2>
                    <p className="text-white/60">This assessment is not available.</p>
                </div>
            </div>
        )
    }

    const currentQuestion = getCurrentQuestion()
    const mcqProgress = getSectionProgress('mcq')
    const subjProgress = getSectionProgress('subjective')
    const codingProgress = getSectionProgress('coding')

    const mcqQuestions = getQuestionsBySection('mcq')
    const subjQuestions = getQuestionsBySection('subjective')
    const codingQuestions = getQuestionsBySection('coding')

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Tab Switch Warning Modal */}
            {showTabSwitchWarning && (
                <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center">
                    <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-6 max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                            <h3 className="text-xl font-bold text-white">Warning: Tab Switch Detected</h3>
                        </div>
                        <p className="text-white/70 mb-4">
                            Switching tabs during the assessment is not allowed. This is your first warning.
                            <strong className="block mt-2 text-red-400">
                                If you switch tabs again, your assessment will be automatically submitted.
                            </strong>
                        </p>
                        <Button
                            onClick={() => setShowTabSwitchWarning(false)}
                            className="w-full bg-white text-black hover:bg-white/90"
                        >
                            I Understand
                        </Button>
                    </div>
                </div>
            )}

            {/* Fullscreen Exit Warning Modal */}
            {showFullscreenWarning && (
                <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center">
                    <div className="bg-[#1a1a1a] border border-white/20 rounded-xl p-6 max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                            <h3 className="text-xl font-bold text-white">Warning: Fullscreen Exit Detected</h3>
                        </div>
                        <p className="text-white/70 mb-4">
                            Exiting fullscreen mode during the assessment is not allowed. This is your first warning.
                            <strong className="block mt-2 text-red-400">
                                If you exit fullscreen again, your assessment will be automatically submitted and flagged.
                            </strong>
                        </p>
                        <Button
                            onClick={() => {
                                setShowFullscreenWarning(false)
                                // Try to re-enter fullscreen
                                const element = document.documentElement
                                if (element.requestFullscreen) {
                                    element.requestFullscreen().catch(() => {})
                                } else if ((element as any).webkitRequestFullscreen) {
                                    (element as any).webkitRequestFullscreen()
                                } else if ((element as any).mozRequestFullScreen) {
                                    (element as any).mozRequestFullScreen()
                                } else if ((element as any).msRequestFullscreen) {
                                    (element as any).msRequestFullscreen()
                                }
                            }}
                            className="w-full bg-white text-black hover:bg-white/90"
                        >
                            I Understand - Return to Fullscreen
                        </Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-[#0a0a0a] border-b border-white/10 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-white">{job.title}</h1>
                            <p className="text-sm text-white/50">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-white">
                                <Clock className="w-4 h-4" />
                                <span className={timeRemaining < 300 ? 'text-red-400' : 'text-white'}>
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white/70">
                                <Shield className="w-3 h-3" />
                                Protected
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Section Progress */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`flex-1 ${currentSection === 'mcq' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-semibold text-white">Section A: MCQs</span>
                                <Badge variant="secondary" className="ml-2 bg-white/10 text-white/70 border-white/10">
                                    {mcqProgress.answered}/{mcqProgress.total}
                                </Badge>
                            </div>
                            <Progress value={(mcqProgress.answered / mcqProgress.total) * 100} className="h-2" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/30" />
                        <div className={`flex-1 ${currentSection === 'subjective' ? 'opacity-100' : currentSection === 'coding' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-semibold text-white">Section B: Subjective</span>
                                <Badge variant="secondary" className="ml-2 bg-white/10 text-white/70 border-white/10">
                                    {subjProgress.answered}/{subjProgress.total}
                                </Badge>
                            </div>
                            <Progress value={(subjProgress.answered / subjProgress.total) * 100} className="h-2" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/30" />
                        <div className={`flex-1 ${currentSection === 'coding' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Code className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-semibold text-white">Section C: Coding</span>
                                <Badge variant="secondary" className="ml-2 bg-white/10 text-white/70 border-white/10">
                                    {codingProgress.answered}/{codingProgress.total}
                                </Badge>
                            </div>
                            <Progress value={(codingProgress.answered / codingProgress.total) * 100} className="h-2" />
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                {currentQuestion && (
                    <div className="bg-white/5 border border-white/10 rounded-xl mb-6">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-white/20 text-white/70">
                                        {currentSection === 'mcq' && 'MCQ'}
                                        {currentSection === 'subjective' && 'Subjective'}
                                        {currentSection === 'coding' && 'Coding'}
                                    </Badge>
                                    <span className="text-sm text-white/50">
                                        Question {currentQuestionIndex + 1} of {getQuestionsBySection(currentSection).length}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-white/70">
                                    {currentQuestion.marks} marks
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    {currentQuestion.content.question || currentQuestion.content.problem_statement}
                                </h3>

                                {/* MCQ */}
                                {currentQuestion.type === 'mcq' && (
                                    <RadioGroup
                                        value={answers[currentQuestion.id]?.response?.selected_option?.toString() || ''}
                                        onValueChange={(value) => updateAnswer(currentQuestion.id, {
                                            selected_option: parseInt(value)
                                        })}
                                    >
                                        {currentQuestion.content.options?.map((option: string, idx: number) => (
                                            <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10">
                                                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} className="border-white/30" />
                                                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-white/80">
                                                    {option}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}

                                {/* Subjective */}
                                {currentQuestion.type === 'subjective' && (
                                    <div className="space-y-4">
                                        <Textarea
                                            placeholder="Type your answer here..."
                                            value={answers[currentQuestion.id]?.response?.text || ''}
                                            onChange={(e) => updateAnswer(currentQuestion.id, {
                                                text: e.target.value
                                            })}
                                            className="min-h-[200px] bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                        />
                                        {currentQuestion.content.max_words && (
                                            <p className="text-sm text-white/50">
                                                Maximum {currentQuestion.content.max_words} words
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Coding */}
                                {currentQuestion.type === 'coding' && (
                                    <div className="space-y-4">
                                        {currentQuestion.content.input_format && (
                                            <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                                <div className="text-sm font-semibold text-white mb-2">Input Format:</div>
                                                <div className="text-sm text-white/70 whitespace-pre-wrap">
                                                    {currentQuestion.content.input_format}
                                                </div>
                                            </div>
                                        )}
                                        {currentQuestion.content.output_format && (
                                            <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                                <div className="text-sm font-semibold text-white mb-2">Output Format:</div>
                                                <div className="text-sm text-white/70 whitespace-pre-wrap">
                                                    {currentQuestion.content.output_format}
                                                </div>
                                            </div>
                                        )}
                                        <div className="border border-white/10 rounded-lg overflow-hidden">
                                            <MonacoEditor
                                                height="400px"
                                                language="javascript"
                                                value={answers[currentQuestion.id]?.response?.code || currentQuestion.content.starter_code?.javascript || ''}
                                                onChange={(value) => updateAnswer(currentQuestion.id, {
                                                    code: value || '',
                                                    language: 'javascript'
                                                })}
                                                theme="vs-dark"
                                                options={{
                                                    minimap: { enabled: false },
                                                    fontSize: 14,
                                                    wordWrap: 'on'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <Button
                                    variant="outline"
                                    onClick={handlePrev}
                                    disabled={currentQuestionIndex === 0 && currentSection === 'mcq'}
                                    className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Previous
                                </Button>

                                {canSubmit() ? (
                                    <Button
                                        onClick={handleSubmit}
                                        className="bg-white text-black hover:bg-white/90"
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit Assessment
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleNext}
                                        className="bg-white text-black hover:bg-white/90"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
