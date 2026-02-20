"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    Brain,
    Clock,
    ChevronLeft,
    ChevronRight,
    FileText,
    Code,
    MessageSquare,
    AlertCircle,
    CheckCircle,
    Play,
    Send,
    Timer,
    Eye,
    Shield,
    Maximize2,
    Minimize2
} from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic import for Monaco Editor
const MonacoEditor = dynamic(
    () => import("@monaco-editor/react").then((mod) => mod.default),
    { ssr: false, loading: () => <div className="h-96 bg-slate-900/50 animate-pulse rounded-xl border border-white/10" /> }
)

interface Question {
    id: string
    type: 'mcq' | 'subjective' | 'coding'
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
    config: {
        duration_minutes: number
        passing_percentage: number
    }
    questions: Question[]
}

interface Answer {
    question_id: string
    question_type: string
    response: any
    time_spent_seconds: number
}

export default function AssessmentPage() {
    const params = useParams()
    const router = useRouter()
    const jobId = params.id as string

    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [started, setStarted] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, Answer>>({})
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [score, setScore] = useState<any>(null)
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
    const [zenMode, setZenMode] = useState(false)

    // Anti-cheat tracking
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [copyPasteCount, setCopyPasteCount] = useState(0)
    const [showAntiCheatWarning, setShowAntiCheatWarning] = useState(false)

    // Load job data
    useEffect(() => {
        const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
        const foundJob = savedJobs.find((j: Job) => j.id === jobId)
        if (foundJob) {
            setJob(foundJob)
            setTimeRemaining((foundJob.config?.duration_minutes || 60) * 60)
        }
        setLoading(false)
    }, [jobId])

    // Timer
    useEffect(() => {
        if (!started || submitted || timeRemaining <= 0) return

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    handleSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [started, submitted, timeRemaining])

    // Anti-cheat: Tab switch detection
    useEffect(() => {
        if (!started || submitted) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => prev + 1)
                setShowAntiCheatWarning(true)
                setTimeout(() => setShowAntiCheatWarning(false), 3000)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [started, submitted])

    // Anti-cheat: Copy-paste detection
    useEffect(() => {
        if (!started || submitted) return

        const handleCopyPaste = (e: ClipboardEvent) => {
            if (e.type === 'paste') {
                setCopyPasteCount(prev => prev + 1)
                setShowAntiCheatWarning(true)
                setTimeout(() => setShowAntiCheatWarning(false), 3000)
            }
        }

        document.addEventListener('paste', handleCopyPaste)
        return () => document.removeEventListener('paste', handleCopyPaste)
    }, [started, submitted])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const currentQuestion = job?.questions?.[currentIndex]
    const totalQuestions = job?.questions?.length || 0
    const answeredCount = Object.keys(answers).length

    const updateAnswer = useCallback((questionId: string, response: any) => {
        const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                question_type: currentQuestion?.type || 'mcq',
                response,
                time_spent_seconds: (prev[questionId]?.time_spent_seconds || 0) + timeSpent
            }
        }))
    }, [questionStartTime, currentQuestion])

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setQuestionStartTime(Date.now())
            setCurrentIndex(currentIndex + 1)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setQuestionStartTime(Date.now())
            setCurrentIndex(currentIndex - 1)
        }
    }

    const handleSubmit = async () => {
        // Calculate score
        let totalScore = 0
        let totalPossible = 0
        let mcqCorrect = 0
        let mcqTotal = 0

        job?.questions?.forEach((q) => {
            totalPossible += q.marks
            const answer = answers[q.id]

            if (q.type === 'mcq') {
                mcqTotal++
                if (answer?.response?.selected_option === q.content.correct_answer) {
                    totalScore += q.marks
                    mcqCorrect++
                }
            } else if (q.type === 'subjective') {
                if (answer?.response?.text?.trim().length > 20) {
                    totalScore += q.marks * 0.7
                }
            } else if (q.type === 'coding') {
                if (answer?.response?.code?.trim().length > 20) {
                    totalScore += q.marks * 0.5
                }
            }
        })

        setScore({
            total_score: Math.round(totalScore),
            total_possible: totalPossible,
            percentage: Math.round((totalScore / totalPossible) * 100),
            mcq_correct: mcqCorrect,
            mcq_total: mcqTotal,
            passed: (totalScore / totalPossible) * 100 >= (job?.config?.passing_percentage || 50)
        })
        setSubmitted(true)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        )
    }

    // Not Found
    if (!job) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl max-w-md w-full">
                    <CardContent className="pt-8 text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Assessment Not Found</h2>
                        <p className="text-muted-foreground mb-6">This assessment might have been removed or is unavailable.</p>
                        <Link href="/">
                            <Button className="w-full rounded-full bg-white/10 hover:bg-white/20">Go Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Landing page
    if (!started && !submitted) {
        return (
            <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] opacity-20" />
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-2xl max-w-2xl w-full relative z-10 shadow-2xl shadow-black/50">
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-white mb-2">{job.title}</CardTitle>
                        <CardDescription className="text-lg text-slate-400">{job.company}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-transform hover:scale-105 duration-300">
                                <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                                <div className="text-2xl font-bold text-white">{job.config?.duration_minutes || 60}m</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-widest">Duration</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-transform hover:scale-105 duration-300">
                                <FileText className="w-6 h-6 text-secondary mx-auto mb-2" />
                                <div className="text-2xl font-bold text-white">{job.questions?.length || 0}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-widest">Questions</div>
                            </div>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
                            <h3 className="flex items-center gap-2 text-amber-400 font-semibold mb-3">
                                <Shield className="w-4 h-4" />
                                Anti-Cheating Enabled
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                    Tab switching is monitored and logged
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                    Copy/Paste actions are tracked
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                    Full screen mode recommended
                                </li>
                            </ul>
                        </div>

                        <Button
                            onClick={() => {
                                setStarted(true)
                                setQuestionStartTime(Date.now())
                            }}
                            className="w-full h-14 text-lg font-bold rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                        >
                            Start Assessment
                            <Play className="w-5 h-5 ml-2 fill-current" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Score Page
    if (submitted && score) {
        return (
            <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none" />

                <Card className="bg-white/5 border-white/10 backdrop-blur-2xl max-w-lg w-full relative z-10">
                    <CardContent className="pt-12 pb-8 px-8 text-center">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ${score.passed
                            ? 'bg-emerald-500/20 border-2 border-emerald-500/50 shadow-emerald-500/20'
                            : 'bg-red-500/20 border-2 border-red-500/50 shadow-red-500/20'
                            }`}>
                            {score.passed
                                ? <CheckCircle className="w-12 h-12 text-emerald-400" />
                                : <AlertCircle className="w-12 h-12 text-red-400" />
                            }
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-2">
                            {score.passed ? "Excellent Work!" : "Assessment Complete"}
                        </h2>
                        <p className="text-muted-foreground mb-8">
                            You have completed {job.title}
                        </p>

                        <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                            <div className="text-5xl font-bold text-white mb-2">{score.percentage}%</div>
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <span>{score.total_score} points</span>
                                <span>•</span>
                                <span>{formatTime(score.total_possible)} possible</span>
                            </div>
                        </div>

                        <Link href="/">
                            <Button className="w-full h-12 rounded-full" variant="outline">Back to Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Active Assessment UI (Zen Mode)
    return (
        <div className={`min-h-screen bg-[#050510] text-slate-200 transition-colors duration-500 ${zenMode ? 'overflow-hidden' : ''}`}>

            {/* Floating Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-none">
                <div className="max-w-6xl mx-auto flex items-center justify-between pointer-events-auto">
                    {/* Timer and Progress Pill */}
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl">
                        <div className={`flex items-center gap-2 font-mono font-bold ${timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-primary'
                            }`}>
                            <Timer className="w-4 h-4" />
                            {formatTime(timeRemaining)}
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Q{currentIndex + 1}/{totalQuestions}</span>
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Controls Pill */}
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-2 shadow-2xl">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setZenMode(!zenMode)}
                            className="w-8 h-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        >
                            {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            size="sm"
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-4"
                        >
                            Submit
                        </Button>
                    </div>
                </div>
            </div>

            {/* Anti-cheat Warnings */}
            {showAntiCheatWarning && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <div className="bg-red-500 text-white px-6 py-2 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center gap-2 font-bold">
                        <Shield className="w-5 h-5 fill-current" />
                        Warning: Activity Flagged!
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="min-h-screen py-24 px-4 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {currentQuestion && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                            {/* Question Header */}
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <Badge className="bg-white/10 text-white border-0 backdrop-blur-md px-3 py-1 text-sm font-medium uppercase tracking-wide">
                                        {currentQuestion.type}
                                    </Badge>
                                    <span className="text-sm text-slate-500 uppercase tracking-widest font-semibold">{currentQuestion.marks} Points</span>
                                </div>

                                {currentQuestion.type === 'mcq' && (
                                    <h2 className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                                        {currentQuestion.content.question}
                                    </h2>
                                )}
                                {currentQuestion.type === 'subjective' && (
                                    <h2 className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                                        {currentQuestion.content.question}
                                    </h2>
                                )}
                            </div>

                            {/* Answer Area */}
                            <div className="space-y-6">
                                {currentQuestion.type === 'mcq' && (
                                    <div className="grid gap-3">
                                        {currentQuestion.content.options?.map((option: string, i: number) => {
                                            const isSelected = answers[currentQuestion.id]?.response?.selected_option === i;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => updateAnswer(currentQuestion.id, { selected_option: i })}
                                                    className={`
                                                        group relative p-6 rounded-2xl cursor-pointer transition-all duration-200 border
                                                        ${isSelected
                                                            ? 'bg-primary/10 border-primary shadow-[0_0_30px_-5px_var(--primary)]'
                                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`
                                                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                                            ${isSelected ? 'border-primary bg-primary text-white' : 'border-slate-600 group-hover:border-slate-400'}
                                                        `}>
                                                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <span className={`text-lg transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                            {option}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {currentQuestion.type === 'subjective' && (
                                    <div className="relative">
                                        <Textarea
                                            placeholder="Type your detailed response here..."
                                            value={answers[currentQuestion.id]?.response?.text || ''}
                                            onChange={(e) => updateAnswer(currentQuestion.id, { text: e.target.value })}
                                            className="min-h-[400px] bg-white/5 border-white/10 text-lg text-slate-200 p-6 rounded-2xl focus:border-primary/50 focus:ring-primary/20 resize-none selection:bg-primary/30"
                                        />
                                        <div className="absolute bottom-4 right-4 text-xs text-slate-500 pointer-events-none">
                                            {answers[currentQuestion.id]?.response?.text?.length || 0} chars
                                        </div>
                                    </div>
                                )}

                                {currentQuestion.type === 'coding' && (
                                    <div className="grid lg:grid-cols-2 gap-6 h-[600px]">
                                        {/* Problem Panel */}
                                        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 overflow-y-auto custom-scrollbar">
                                            <h3 className="text-xl font-bold text-white mb-4">Problem Statement</h3>
                                            <div className="prose prose-invert prose-p:text-slate-300 max-w-none">
                                                <p>{currentQuestion.content.problem_statement}</p>

                                                {currentQuestion.content.input_format && (
                                                    <div className="mt-6">
                                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Input Format</h4>
                                                        <p className="text-sm">{currentQuestion.content.input_format}</p>
                                                    </div>
                                                )}

                                                {currentQuestion.content.examples && (
                                                    <div className="mt-6 space-y-4">
                                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Examples</h4>
                                                        {currentQuestion.content.examples.map((ex: any, i: number) => (
                                                            <div key={i} className="bg-black/40 rounded-xl p-4 border border-white/5">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <div className="text-xs text-slate-500 mb-1">Input</div>
                                                                        <code className="text-sm font-mono text-emerald-400">{ex.input}</code>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs text-slate-500 mb-1">Output</div>
                                                                        <code className="text-sm font-mono text-emerald-400">{ex.output}</code>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Editor Panel */}
                                        <div className="flex flex-col bg-[#1e1e1e] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Code className="w-4 h-4 text-primary" />
                                                    <span className="text-sm font-medium text-slate-300">Code Editor</span>
                                                </div>
                                                <select
                                                    className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-primary/50"
                                                    value={answers[currentQuestion.id]?.response?.language || 'python'}
                                                    onChange={(e) => updateAnswer(currentQuestion.id, {
                                                        ...answers[currentQuestion.id]?.response,
                                                        language: e.target.value
                                                    })}
                                                >
                                                    <option value="python">Python</option>
                                                    <option value="javascript">JavaScript</option>
                                                    <option value="java">Java</option>
                                                    <option value="cpp">C++</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 relative">
                                                <MonacoEditor
                                                    height="100%"
                                                    language={answers[currentQuestion.id]?.response?.language || 'python'}
                                                    theme="vs-dark"
                                                    value={answers[currentQuestion.id]?.response?.code || currentQuestion.content.starter_code?.python || '# Write your solution here\n'}
                                                    onChange={(value) => updateAnswer(currentQuestion.id, {
                                                        ...answers[currentQuestion.id]?.response,
                                                        code: value
                                                    })}
                                                    options={{
                                                        minimap: { enabled: false },
                                                        fontSize: 14,
                                                        fontFamily: "'Fira Code', monospace",
                                                        scrollBeyondLastLine: false,
                                                        padding: { top: 16, bottom: 16 },
                                                        lineNumbers: "on",
                                                        roundedSelection: true,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Navigation Controls */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${zenMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <div className="flex items-center gap-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
                    <Button
                        variant="ghost"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="rounded-full text-slate-400 hover:text-white hover:bg-white/10 pl-2 pr-4"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        Prev
                    </Button>

                    <div className="h-4 w-px bg-white/10" />

                    <Button
                        onClick={handleNext}
                        disabled={currentIndex === totalQuestions - 1}
                        className="rounded-full bg-primary/20 text-primary hover:bg-primary/30 hover:text-white border border-primary/20 pl-4 pr-2"
                    >
                        Next
                        <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </div>
            </div>

        </div>
    )
}
