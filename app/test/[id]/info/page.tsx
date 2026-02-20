"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useResume } from "@/app/contexts/ResumeContext"
import { useAuth } from "@/contexts/AuthContext"

interface Job {
    id: string
    title: string
    company: string
}

export default function CandidateInfoPage() {
    const params = useParams()
    const router = useRouter()
    const assessmentId = params.id as string
    const { parseResume } = useResume()
    const { user, loading: authLoading } = useAuth()

    const [job, setJob] = useState<Job | null>(null)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [resumeFileName, setResumeFileName] = useState("")
    const [uploading, setUploading] = useState(false)
    const [errors, setErrors] = useState<{ name?: string, email?: string, resume?: string }>({})

    useEffect(() => {
        const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
        const foundJob = savedJobs.find((j: Job) => j.id === assessmentId)
        if (foundJob) {
            setJob(foundJob)
        }
    }, [assessmentId])

    useEffect(() => {
        if (!authLoading && user) {
            const userName = user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                ""
            setName(userName)

            if (user.email) {
                setEmail(user.email)
            }
        }
    }, [user, authLoading])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
            if (!allowedTypes.includes(file.type)) {
                setErrors(prev => ({ ...prev, resume: 'Please upload PDF, DOC, DOCX, or TXT files only' }))
                return
            }

            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, resume: 'File size must be less than 5MB' }))
                return
            }

            setResumeFile(file)
            setResumeFileName(file.name)
            setErrors(prev => ({ ...prev, resume: undefined }))
        }
    }

    const handleResumeUpload = async () => {
        if (!resumeFile) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', resumeFile)

            const response = await fetch('/api/resume-parser-v2', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Resume parsing failed')
            }

            const data = await response.json()

            sessionStorage.setItem(`resume_data_${assessmentId}`, JSON.stringify(data))

            setUploading(false)
            return true
        } catch (error) {
            console.error('Resume upload error:', error)
            setErrors(prev => ({ ...prev, resume: 'Failed to parse resume. You can continue without it.' }))
            setUploading(false)
            return false
        }
    }

    const validateForm = () => {
        const newErrors: { name?: string, email?: string, resume?: string } = {}

        if (!name.trim()) {
            newErrors.name = 'Name is required'
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleContinue = async () => {
        if (!validateForm()) return

        if (resumeFile) {
            const uploaded = await handleResumeUpload()
            if (!uploaded && errors.resume) {
                // Continue even if resume upload fails
            }
        }

        const candidateInfo = {
            name: name.trim(),
            email: email.trim(),
            assessmentId,
            startedAt: new Date().toISOString()
        }
        sessionStorage.setItem(`candidate_info_${assessmentId}`, JSON.stringify(candidateInfo))

        router.push(`/test/${assessmentId}/assessment`)
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-lg">
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E8C547]/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#E8C547]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Enter Your Details</h2>
                            <p className="text-sm text-white/50">
                                {job ? `${job.title} at ${job.company}` : 'Assessment'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Info Notice */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-100">
                                {user ? (
                                    <>
                                        <div className="font-semibold mb-1">Logged in as {user.email}</div>
                                        <div className="text-blue-200/70">
                                            Your details have been auto-filled from your account. You can update them if needed. Resume is optional but recommended.
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="font-semibold mb-1">No Signup Required</div>
                                        <div className="text-blue-200/70">
                                            Just provide your basic information to get started. Your resume is optional but recommended for better evaluation.
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-white/70">Full Name *</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setErrors(prev => ({ ...prev, name: undefined }))
                            }}
                            className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 ${errors.name ? 'border-red-500' : ''}`}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-400">{errors.name}</p>
                        )}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-white/70">Email Address *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john.doe@example.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setErrors(prev => ({ ...prev, email: undefined }))
                            }}
                            className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 ${errors.email ? 'border-red-500' : ''}`}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-400">{errors.email}</p>
                        )}
                    </div>

                    {/* Resume Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="resume" className="text-white/70">Resume (Optional)</Label>
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#E8C547]/50 transition-colors">
                            <input
                                type="file"
                                id="resume"
                                accept=".pdf,.doc,.docx,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label htmlFor="resume" className="cursor-pointer">
                                {resumeFileName ? (
                                    <div className="space-y-2">
                                        <FileText className="w-8 h-8 text-[#E8C547] mx-auto" />
                                        <div className="font-medium text-white">{resumeFileName}</div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setResumeFile(null)
                                                setResumeFileName("")
                                            }}
                                            className="text-white/60 hover:text-white hover:bg-white/10"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="w-8 h-8 text-white/40 mx-auto" />
                                        <div className="text-sm text-white/60">
                                            <span className="text-[#E8C547] font-medium">Click to upload</span> or drag and drop
                                        </div>
                                        <div className="text-xs text-white/40">PDF, DOC, DOCX, or TXT (max 5MB)</div>
                                    </div>
                                )}
                            </label>
                        </div>
                        {errors.resume && (
                            <p className="text-sm text-red-400">{errors.resume}</p>
                        )}
                        {uploading && (
                            <p className="text-sm text-blue-400">Parsing resume...</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1 border-white/10 text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={handleContinue}
                            className="flex-1 bg-[#E8C547] hover:bg-[#E8C547]/90 text-black"
                            disabled={uploading}
                        >
                            Continue to Assessment
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
