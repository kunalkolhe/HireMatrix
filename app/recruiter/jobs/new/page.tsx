"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
    Brain,
    ArrowLeft,
    Sparkles,
    Loader2,
    CheckCircle,
    Code,
    FileText,
    MessageSquare,
    AlertCircle,
    Zap,
    Settings,
    ChevronRight,
    Briefcase
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { createJobWithAssessment } from "@/lib/jobService"
import type { ParsedSkills } from "@/lib/types"

interface JDParseResult {
    title: string
    experience_level: string
    skills: ParsedSkills
    responsibilities: string[]
    qualifications: string[]
    assessment_recommendations: {
        mcq_topics: string[]
        subjective_topics: string[]
        coding_topics: string[]
        difficulty: string
        suggested_duration_minutes: number
    }
}

interface AssessmentConfig {
    mcq_count: number
    mcq_weightage: number
    subjective_count: number
    subjective_weightage: number
    coding_count: number
    coding_weightage: number
    duration_minutes: number
    passing_percentage: number
}

export default function NewJobPage() {
    const router = useRouter()
    const { user } = useAuth()

    const [step, setStep] = useState<'input' | 'parsed' | 'config' | 'generating' | 'ready'>('input')
    const [company, setCompany] = useState("")
    const [jobDescription, setJobDescription] = useState("")
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState("")
    const [parsedJD, setParsedJD] = useState<JDParseResult | null>(null)
    const [generatedQuestions, setGeneratedQuestions] = useState<any>(null)

    const [config, setConfig] = useState<AssessmentConfig>({
        mcq_count: 10,
        mcq_weightage: 30,
        subjective_count: 3,
        subjective_weightage: 30,
        coding_count: 2,
        coding_weightage: 40,
        duration_minutes: 60,
        passing_percentage: 50
    })

    const handleAnalyzeJD = async () => {
        if (!jobDescription.trim()) {
            setError("Please enter a job description")
            return
        }

        setIsAnalyzing(true)
        setError("")

        try {
            const response = await fetch('/api/parse-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDescription })
            })

            const data = await response.json()

            if (data.success) {
                setParsedJD(data.data)
                // Update config with AI recommendations
                if (data.data.assessment_recommendations) {
                    setConfig(prev => ({
                        ...prev,
                        duration_minutes: data.data.assessment_recommendations.suggested_duration_minutes || 60
                    }))
                }
                setStep('parsed')
            } else {
                setError(data.error || 'Failed to analyze job description')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleGenerateAssessment = async () => {
        if (!parsedJD) return

        setIsGenerating(true)
        setStep('generating')
        setError("")

        try {
            const response = await fetch('/api/generate-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle: parsedJD.title,
                    skills: parsedJD.skills,
                    experienceLevel: parsedJD.experience_level,
                    config: {
                        mcq_count: config.mcq_count,
                        subjective_count: config.subjective_count,
                        coding_count: config.coding_count,
                        difficulty: parsedJD.assessment_recommendations?.difficulty || 'medium'
                    }
                })
            })

            const data = await response.json()

            if (data.success) {
                setGeneratedQuestions(data.data)
                setStep('ready')
            } else {
                setError(data.error || 'Failed to generate assessment')
                setStep('config')
            }
        } catch (err) {
            setError('Network error. Please try again.')
            setStep('config')
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePublish = async () => {
        if (!user?.id) {
            toast.error('Please log in to create an assessment')
            return
        }

        if (!parsedJD || !generatedQuestions?.questions) {
            toast.error('Please generate questions before publishing')
            return
        }

        try {
            // Normalize experience level (ensure it's one of: fresher, junior, mid, senior)
            let experienceLevel = (parsedJD.experience_level || 'fresher').toLowerCase().trim()
            const levelMapping: Record<string, string> = {
                'fresher': 'fresher', 'fresh': 'fresher', 'entry': 'fresher', 'entry-level': 'fresher', 'beginner': 'fresher',
                'junior': 'junior', 'jr': 'junior', 'associate': 'junior',
                'mid': 'mid', 'middle': 'mid', 'intermediate': 'mid', 'mid-level': 'mid',
                'senior': 'senior', 'sr': 'senior', 'lead': 'senior', 'principal': 'senior', 'expert': 'senior'
            }
            experienceLevel = levelMapping[experienceLevel] || 'fresher'

            // Save to Supabase
            const result = await createJobWithAssessment({
                title: parsedJD.title || 'Untitled Assessment',
                company,
                description: jobDescription,
                parsed_skills: parsedJD.skills,
                experience_level: experienceLevel as any,
                responsibilities: parsedJD.responsibilities || [],
                config: {
                    ...config,
                    duration_minutes: config.duration_minutes || 60,
                    passing_percentage: config.passing_percentage || 50
                },
                questions: generatedQuestions.questions.map((q: any, index: number) => ({
                    ...q,
                    order: q.order || index
                })),
                recruiter_id: user.id,
                status: 'active'
            })

            if (result) {
                toast.success('Assessment created successfully!')
                // Also save to localStorage as backup (for gradual migration)
                try {
                    const existingJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    existingJobs.push({
                        id: result.job.id,
                        title: result.job.title,
                        company,
                        description: jobDescription,
                        parsed_skills: parsedJD.skills,
                        experience_level: parsedJD.experience_level,
                        config,
                        questions: generatedQuestions.questions,
                        status: 'active',
                        createdAt: result.job.created_at,
                        candidatesCount: 0,
                        questionsCount: generatedQuestions.questions.length
                    })
                    localStorage.setItem('assessai_jobs', JSON.stringify(existingJobs))
                } catch (e) {
                    console.warn('Failed to save to localStorage backup:', e)
                }

                router.push('/recruiter/dashboard')
            } else {
                toast.error('Failed to create assessment. Please try again.')
            }
        } catch (error: any) {
            console.error('Error creating assessment:', error)
            let errorMessage = 'Failed to create assessment'
            if (error?.code === '23514') {
                errorMessage = 'Invalid experience level. The system will automatically normalize it, but please check the console for details.'
            } else if (error?.message) {
                errorMessage = error.message
            }
            toast.error(errorMessage)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-center relative mb-8">
                <Link href="/recruiter/dashboard" className="absolute left-0">
                    <Button variant="ghost" className="text-white/50 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </Link>
                <div className="flex items-center gap-4">
                    {[
                        { id: 'input', label: 'Details', icon: FileText },
                        { id: 'parsed', label: 'Analysis', icon: Sparkles },
                        { id: 'config', label: 'Configure', icon: Settings },
                        { id: 'ready', label: 'Publish', icon: CheckCircle }
                    ].map((s, i) => {
                        const isActive = step === s.id;
                        const isCompleted = ['parsed', 'config', 'ready'].indexOf(step) > ['input', 'parsed', 'config', 'ready'].indexOf(s.id);

                        return (
                            <div key={s.id} className="flex items-center">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${isActive
                                    ? 'bg-white text-black shadow-lg scale-105'
                                    : isCompleted
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/10 text-white/50'
                                    }`}>
                                    <s.icon className="w-4 h-4" />
                                    <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                                </div>
                                {i < 3 && <div className="w-8 h-0.5 bg-white/10 mx-2" />}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Step 1: JD Input */}
                {step === 'input' && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Briefcase className="w-6 h-6 text-primary" />
                                Create New Assessment
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Paste the job description. Our AI will analyze it to suggest the perfect assessment structure.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="company" className="text-white/70">Company Name</Label>
                                <Input
                                    id="company"
                                    placeholder="e.g., Acme Corp"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jd" className="text-white/70">Job Description</Label>
                                <Textarea
                                    id="jd"
                                    placeholder="Paste the full JD here..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    className="min-h-[300px] bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none p-4"
                                />
                                <p className="text-xs text-white/40 text-right">{jobDescription.length} chars</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    <p className="text-sm text-red-500 font-medium">{error}</p>
                                </div>
                            )}

                            <Button
                                onClick={handleAnalyzeJD}
                                disabled={isAnalyzing || jobDescription.length < 50}
                                className="w-full h-12 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 text-base"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyzing JD...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Analyze Description
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Parsed Result */}
                {step === 'parsed' && parsedJD && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Sparkles className="w-6 h-6 text-secondary" />
                                        AI Analysis Complete
                                    </CardTitle>
                                    <CardDescription className="text-white/50">
                                        We extracted the following requirements from your JD.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStep('input')}
                                    className="rounded-full"
                                >
                                    Edit JD
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Position</p>
                                    <p className="text-lg font-bold text-white">{parsedJD.title}</p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Experience Level</p>
                                    <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/10 capitalize text-sm">
                                        {parsedJD.experience_level}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <Code className="w-4 h-4 text-primary" />
                                    Identified Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {parsedJD.skills.technical.map((skill, i) => (
                                        <Badge key={i} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
                                            {skill}
                                        </Badge>
                                    ))}
                                    {parsedJD.skills.tools.map((tool, i) => (
                                        <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                                            {tool}
                                        </Badge>
                                    ))}
                                    {parsedJD.skills.soft.map((skill, i) => (
                                        <Badge key={i} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={() => setStep('config')}
                                className="w-full h-12 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 text-base"
                            >
                                Continue Configuration
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Config */}
                {step === 'config' && parsedJD && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Settings className="w-6 h-6 text-white" />
                                Configure Assessment
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Customize the difficulty and composition of the test.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                                        <FileText className="w-4 h-4" />
                                        <span className="font-semibold text-sm">MCQs</span>
                                    </div>
                                    <Input
                                        type="number"
                                        value={config.mcq_count}
                                        onChange={(e) => setConfig({ ...config, mcq_count: parseInt(e.target.value) || 0 })}
                                        className="bg-transparent border-white/10 text-white text-center font-bold text-xl h-12"
                                    />
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 text-amber-400">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="font-semibold text-sm">Subjective</span>
                                    </div>
                                    <Input
                                        type="number"
                                        value={config.subjective_count}
                                        onChange={(e) => setConfig({ ...config, subjective_count: parseInt(e.target.value) || 0 })}
                                        className="bg-transparent border-white/10 text-white text-center font-bold text-xl h-12"
                                    />
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                                        <Code className="w-4 h-4" />
                                        <span className="font-semibold text-sm">Coding</span>
                                    </div>
                                    <Input
                                        type="number"
                                        value={config.coding_count}
                                        onChange={(e) => setConfig({ ...config, coding_count: parseInt(e.target.value) || 0 })}
                                        className="bg-transparent border-white/10 text-white text-center font-bold text-xl h-12"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Duration</Label>
                                    <span className="text-primary font-bold">{config.duration_minutes} min</span>
                                </div>
                                <Slider
                                    value={[config.duration_minutes]}
                                    onValueChange={([value]) => setConfig({ ...config, duration_minutes: value })}
                                    min={15}
                                    max={120}
                                    step={15}
                                    className="py-4"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('parsed')}
                                    className="rounded-full"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleGenerateAssessment}
                                    className="flex-1 rounded-full h-12 shadow-lg shadow-violet-500/20"
                                >
                                    <Zap className="w-4 h-4 mr-2 fill-current" />
                                    Generate Assessment
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3.5: Generating */}
                {step === 'generating' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="relative">
                            <div className="w-24 h-24 bg-primary/20 rounded-full blur-xl absolute inset-0 animate-pulse-glow" />
                            <div className="w-24 h-24 bg-background border border-white/10 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mt-8 mb-2">Generating Assessment...</h2>
                        <p className="text-white/50">Crafting questions tailored to the job profile.</p>
                    </div>
                )}

                {/* Step 4: Ready */}
                {step === 'ready' && generatedQuestions && (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                        <CardContent className="pt-8 space-y-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">Ready to Launch!</h2>
                                <p className="text-white/50">Your assessment has been generated and is ready to be published.</p>
                            </div>

                            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <p className="text-2xl font-bold text-white">{generatedQuestions.summary.mcq_count}</p>
                                    <p className="text-xs text-white/40">MCQs</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <p className="text-2xl font-bold text-white">{generatedQuestions.summary.subjective_count}</p>
                                    <p className="text-xs text-white/40">Written</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <p className="text-2xl font-bold text-white">{generatedQuestions.summary.coding_count}</p>
                                    <p className="text-xs text-white/40">Coding</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <p className="text-2xl font-bold text-blue-400">{generatedQuestions.summary.total_marks}</p>
                                    <p className="text-xs text-white/40">Marks</p>
                                </div>
                            </div>

                            <Button
                                onClick={handlePublish}
                                className="w-full h-14 text-lg font-semibold rounded-full shadow-xl shadow-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                            >
                                Publish & Share Link
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
