"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
    ArrowLeft,
    CheckCircle,
    Code,
    FileText,
    MessageSquare,
    AlertCircle,
    Settings,
    Briefcase,
    Save
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import type { ParsedSkills } from "@/lib/types"

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

interface ParsedJD {
    title: string
    experience_level: string
    skills: ParsedSkills
}

export default function EditJobPage() {
    const router = useRouter()
    const params = useParams()
    const { user } = useAuth()
    const jobId = params.id as string

    const [loading, setLoading] = useState(true)
    const [company, setCompany] = useState("")
    const [title, setTitle] = useState("")
    const [jobDescription, setJobDescription] = useState("")
    const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null)
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
    const [error, setError] = useState("")

    useEffect(() => {
        const loadJob = async () => {
            try {
                // Try Supabase first
                const { getJobById } = await import('@/lib/jobService')
                const supabaseJob = await getJobById(jobId)

                if (supabaseJob) {
                    setCompany(supabaseJob.company || "")
                    setTitle(supabaseJob.title || "")
                    setJobDescription(supabaseJob.description || "")

                    // Set parsed JD data if available
                    if (supabaseJob.parsed_skills) {
                        setParsedJD({
                            title: supabaseJob.title,
                            experience_level: supabaseJob.experience_level || 'fresher',
                            skills: supabaseJob.parsed_skills
                        })
                    }

                    // Set config if available
                    if (supabaseJob.assessment?.config) {
                        setConfig(supabaseJob.assessment.config)
                    }
                } else {
                    // Fallback to localStorage
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const job = savedJobs.find((j: any) => j.id === jobId)

                    if (!job) {
                        toast.error("Assessment not found")
                        router.push('/recruiter/dashboard')
                        return
                    }

                    setCompany(job.company || "")
                    setTitle(job.title || "")
                    setJobDescription(job.description || "")

                    // Set parsed JD data if available
                    if (job.parsed_skills) {
                        setParsedJD({
                            title: job.title,
                            experience_level: job.experience_level || 'fresher',
                            skills: job.parsed_skills
                        })
                    }

                    // Set config if available
                    if (job.config) {
                        setConfig(job.config)
                    }
                }
            } catch (err) {
                console.error("Error loading job:", err)
                // Fallback to localStorage
                try {
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const job = savedJobs.find((j: any) => j.id === jobId)
                    if (job) {
                        setCompany(job.company || "")
                        setTitle(job.title || "")
                        setJobDescription(job.description || "")
                        if (job.parsed_skills) {
                            setParsedJD({
                                title: job.title,
                                experience_level: job.experience_level || 'fresher',
                                skills: job.parsed_skills
                            })
                        }
                        if (job.config) {
                            setConfig(job.config)
                        }
                    } else {
                        toast.error("Assessment not found")
                        router.push('/recruiter/dashboard')
                    }
                } catch (e) {
                    setError("Failed to load assessment details")
                }
            } finally {
                setLoading(false)
            }
        }

        loadJob()
    }, [jobId, router])

    const handleSave = async () => {
        if (!company.trim() || !title.trim()) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            // Try Supabase first
            const { updateJob, getJobById } = await import('@/lib/jobService')
            const { supabase } = await import('@/lib/supabase')

            // Update job
            const jobUpdated = await updateJob(jobId, {
                title,
                company,
                description: jobDescription
            })

            if (jobUpdated) {
                // Update assessment config if it exists
                const job = await getJobById(jobId)
                if (job?.assessment?.id) {
                    const { error: assessmentError } = await supabase
                        .from('assessments')
                        .update({
                            config: config,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', job.assessment.id)

                    if (assessmentError) {
                        console.error('Error updating assessment config:', assessmentError)
                    }
                }

                // Also update localStorage as backup
                try {
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const updatedJobs = savedJobs.map((j: any) => {
                        if (j.id === jobId) {
                            return {
                                ...j,
                                company,
                                title,
                                description: jobDescription,
                                config,
                                updatedAt: new Date().toISOString()
                            }
                        }
                        return j
                    })
                    localStorage.setItem('assessai_jobs', JSON.stringify(updatedJobs))
                } catch (e) {
                    console.warn('Failed to update localStorage backup:', e)
                }

                toast.success("Assessment updated successfully")
                router.push('/recruiter/dashboard')
            } else {
                throw new Error('Failed to update job')
            }
        } catch (err) {
            console.error("Error saving job:", err)
            // Fallback to localStorage
            try {
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const updatedJobs = savedJobs.map((job: any) => {
                    if (job.id === jobId) {
                        return {
                            ...job,
                            company,
                            title,
                            description: jobDescription,
                            config,
                            updatedAt: new Date().toISOString()
                        }
                    }
                    return job
                })
                localStorage.setItem('assessai_jobs', JSON.stringify(updatedJobs))
                toast.success("Assessment updated successfully (localStorage)")
                router.push('/recruiter/dashboard')
            } catch (e) {
                toast.error("Failed to update assessment")
            }
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/recruiter/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Edit Assessment</h1>
                        <p className="text-white/50">Update assessment details and configuration</p>
                    </div>
                </div>
                <Button onClick={handleSave} className="rounded-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-8 max-w-4xl mx-auto">
                {/* Basic Details */}
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Briefcase className="w-5 h-5 text-blue-400" />
                            Assessment Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-white/70">Job Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company" className="text-white/70">Company Name</Label>
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-white/70">Job Description</Label>
                            <Textarea
                                id="description"
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="min-h-[150px] bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Configuration */}
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Settings className="w-5 h-5 text-blue-400" />
                            Assessment Configuration
                        </CardTitle>
                        <CardDescription className="text-white/50">
                            Adjust the difficulty and structure of the assessment
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                <div className="flex items-center gap-2 mb-2 text-blue-400">
                                    <FileText className="w-4 h-4" />
                                    <span className="font-semibold text-sm text-white">MCQs</span>
                                </div>
                                <Input
                                    type="number"
                                    value={config.mcq_count}
                                    onChange={(e) => setConfig({ ...config, mcq_count: parseInt(e.target.value) || 0 })}
                                    className="text-white text-center font-bold text-xl h-12 bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                <div className="flex items-center gap-2 mb-2 text-amber-400">
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="font-semibold text-sm text-white">Subjective</span>
                                </div>
                                <Input
                                    type="number"
                                    value={config.subjective_count}
                                    onChange={(e) => setConfig({ ...config, subjective_count: parseInt(e.target.value) || 0 })}
                                    className="text-white text-center font-bold text-xl h-12 bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                                    <Code className="w-4 h-4" />
                                    <span className="font-semibold text-sm text-white">Coding</span>
                                </div>
                                <Input
                                    type="number"
                                    value={config.coding_count}
                                    onChange={(e) => setConfig({ ...config, coding_count: parseInt(e.target.value) || 0 })}
                                    className="text-white text-center font-bold text-xl h-12 bg-white/5 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-white/70">Duration</Label>
                                <span className="text-blue-400 font-bold">{config.duration_minutes} min</span>
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
                    </CardContent>
                </Card>

                {/* Skills Visualzation */}
                {parsedJD && (
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base font-medium text-white">Target Skills</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {parsedJD.skills.technical.map((skill, i) => (
                                    <Badge key={`tech-${i}`} variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                                        {skill}
                                    </Badge>
                                ))}
                                {parsedJD.skills.tools.map((tool, i) => (
                                    <Badge key={`tool-${i}`} variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                                        {tool}
                                    </Badge>
                                ))}
                                {parsedJD.skills.soft.map((skill, i) => (
                                    <Badge key={`soft-${i}`} variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
