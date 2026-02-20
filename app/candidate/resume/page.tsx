"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle2, X, Plus, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { saveResumeData, getResumeData } from "@/lib/resumeService"
import { toast } from "sonner"

export default function ResumeUploadPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [parsing, setParsing] = useState(false)
    const [parsedData, setParsedData] = useState<any>(null)
    const [confirmedSkills, setConfirmedSkills] = useState<string[]>([])
    const [newSkill, setNewSkill] = useState("")
    const [saving, setSaving] = useState(false)
    const [hasResume, setHasResume] = useState(false)

    useEffect(() => {
        checkExistingResume()
    }, [user])

    const checkExistingResume = async () => {
        if (!user?.id) return

        try {
            const resumeData = await getResumeData(user.id)
            if (resumeData) {
                setHasResume(true)
                setParsedData({
                    skills: resumeData.skills || [],
                    personalInfo: resumeData.personal_info || {},
                    experience: resumeData.experience || [],
                    education: resumeData.education || [],
                    summary: resumeData.summary || '',
                    atsScore: resumeData.ats_score || 0
                })
                setConfirmedSkills(resumeData.skills || [])
            }
        } catch (error) {
            console.error('Error checking resume:', error)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf']
            if (!allowedTypes.includes(file.type)) {
                toast.error('Please upload PDF, DOC, DOCX, TXT, or RTF files only')
                return
            }

            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB')
                return
            }

            setResumeFile(file)
            setParsedData(null)
            setConfirmedSkills([])
        }
    }

    const handleParseResume = async () => {
        if (!resumeFile || !user?.id) return

        setParsing(true)
        try {
            const formData = new FormData()
            formData.append('file', resumeFile)

            const response = await fetch('/api/resume-parser-v2', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Resume parsing failed')
            }

            const data = await response.json()

            // Extract skills from parsed data
            const extractedSkills = data.skills || []
            setParsedData(data)
            setConfirmedSkills(extractedSkills)

            toast.success('Resume parsed successfully! Please review and confirm your skills.')
        } catch (error: any) {
            console.error('Resume parsing error:', error)
            toast.error(error.message || 'Failed to parse resume. Please try again.')
        } finally {
            setParsing(false)
        }
    }

    const handleSaveResume = async () => {
        if (!user?.id || !parsedData) {
            toast.error('Please upload and parse your resume first')
            return
        }

        if (confirmedSkills.length === 0) {
            toast.error('Please confirm at least one skill')
            return
        }

        setSaving(true)
        try {
            // Upload resume file to storage if needed (optional - resume data is stored in database)
            let resumeUrl = null
            if (resumeFile) {
                try {
                    const fileExt = resumeFile.name.split('.').pop()
                    const fileName = `${user.id}-${Date.now()}.${fileExt}`
                    const filePath = `resumes/${fileName}`

                    const { error: uploadError, data: uploadData } = await supabase.storage
                        .from('resumes')
                        .upload(filePath, resumeFile, {
                            cacheControl: '3600',
                            upsert: true
                        })

                    if (!uploadError && uploadData) {
                        const { data: urlData } = supabase.storage
                            .from('resumes')
                            .getPublicUrl(filePath)
                        resumeUrl = urlData.publicUrl
                    }
                } catch (storageError) {
                    // Storage bucket might not exist - that's okay, we'll just store the parsed data
                    console.warn('Could not upload resume file to storage:', storageError)
                }
            }

            // Save resume data
            await saveResumeData(user.id, {
                atsScore: parsedData.atsScore || 0,
                skills: confirmedSkills,
                analysis: parsedData.analysis || { strengths: [], improvements: [], overall: '' },
                personalInfo: parsedData.personalInfo || { name: '', email: '', phone: '', address: '' },
                experience: parsedData.experience || [],
                education: parsedData.education || [],
                summary: parsedData.summary || '',
                achievements: parsedData.achievements || [],
                certifications: parsedData.certifications || [],
                languages: parsedData.languages || [],
                projects: parsedData.projects || []
            })

            // Update user_profiles to mark resume as uploaded
            // Try to update with has_resume column, but handle gracefully if column doesn't exist
            const profileUpdate: any = {
                id: user.id
            }

            // Only include these fields if they exist in the schema
            try {
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert({
                        id: user.id,
                        has_resume: true,
                        resume_uploaded_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'
                    })

                if (profileError) {
                    // If column doesn't exist, try without it
                    if (profileError.message.includes('has_resume') || profileError.message.includes('schema cache')) {
                        console.warn('has_resume column not found, updating without it. Please run the migration script.')
                        const { error: fallbackError } = await supabase
                            .from('user_profiles')
                            .upsert({
                                id: user.id
                            }, {
                                onConflict: 'id'
                            })

                        if (fallbackError) {
                            throw new Error(`Failed to update profile: ${fallbackError.message}`)
                        }
                    } else {
                        throw new Error(`Failed to update profile: ${profileError.message}`)
                    }
                }
            } catch (error: any) {
                // If it's a schema error, provide helpful message
                if (error.message?.includes('has_resume') || error.message?.includes('schema cache')) {
                    throw new Error(
                        'Database schema is missing the has_resume column. ' +
                        'Please run the migration script (add-resume-columns-migration.sql) in your Supabase SQL Editor.'
                    )
                }
                throw error
            }

            // Update skills in user profile metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    skills: confirmedSkills,
                    has_resume: true
                }
            })

            if (authError) {
                console.warn('Failed to update auth metadata:', authError)
                // Don't throw - profile update is more important
            }

            // Verify the update was successful (only if column exists)
            try {
                const { data: verifyProfile } = await supabase
                    .from('user_profiles')
                    .select('has_resume')
                    .eq('id', user.id)
                    .maybeSingle()

                // Only check has_resume if the column exists and we got a result
                if (verifyProfile && 'has_resume' in verifyProfile && !verifyProfile.has_resume) {
                    throw new Error('Failed to verify resume upload. Please try again.')
                }
            } catch (verifyError: any) {
                // If column doesn't exist, skip verification but log warning
                if (verifyError.message?.includes('has_resume') || verifyError.message?.includes('schema cache')) {
                    console.warn('Cannot verify has_resume - column may not exist. Resume data was saved successfully.')
                } else {
                    throw verifyError
                }
            }

            toast.success('Resume saved successfully!')
            setHasResume(true)

            // Redirect to dashboard after a short delay to ensure database is updated
            setTimeout(() => {
                router.push('/candidate/dashboard')
            }, 1500)
        } catch (error: any) {
            console.error('Error saving resume:', error)
            toast.error(error.message || 'Failed to save resume. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const addSkill = () => {
        if (newSkill.trim() && !confirmedSkills.includes(newSkill.trim())) {
            setConfirmedSkills([...confirmedSkills, newSkill.trim()])
            setNewSkill("")
        }
    }

    const removeSkill = (skill: string) => {
        setConfirmedSkills(confirmedSkills.filter(s => s !== skill))
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Upload Resume</h1>
                    <p className="text-white/50 mt-1">
                        {hasResume
                            ? 'Update your resume to keep your profile current'
                            : 'Upload your resume to get started with assessments'}
                    </p>
                </div>
            </div>

            {/* Upload Section */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Resume File</CardTitle>
                    <CardDescription className="text-white/50">
                        Upload your resume in PDF, DOC, DOCX, TXT, or RTF format (max 5MB)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-[#E8C547]/50 transition-colors">
                        <input
                            type="file"
                            id="resume-upload"
                            accept=".pdf,.doc,.docx,.txt,.rtf"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={parsing || saving}
                        />
                        <label htmlFor="resume-upload" className="cursor-pointer">
                            {resumeFile ? (
                                <div className="space-y-2">
                                    <FileText className="w-12 h-12 text-[#E8C547] mx-auto" />
                                    <div className="font-medium text-white">{resumeFile.name}</div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setResumeFile(null)
                                            setParsedData(null)
                                            setConfirmedSkills([])
                                        }}
                                        className="text-white/60 hover:text-white hover:bg-white/10"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="w-12 h-12 text-white/40 mx-auto" />
                                    <div className="text-sm text-white/60">
                                        <span className="text-[#E8C547] font-medium">Click to upload</span> or drag and drop
                                    </div>
                                    <div className="text-xs text-white/40">PDF, DOC, DOCX, TXT, or RTF (max 5MB)</div>
                                </div>
                            )}
                        </label>
                    </div>

                    {resumeFile && !parsedData && (
                        <Button
                            onClick={handleParseResume}
                            disabled={parsing}
                            className="w-full bg-[#E8C547] hover:bg-[#E8C547]/90 text-black"
                        >
                            {parsing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Parsing Resume...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Parse Resume
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Skills Confirmation Section */}
            {parsedData && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Confirm Your Skills</CardTitle>
                        <CardDescription className="text-white/50">
                            Review and confirm the skills extracted from your resume. You can add or remove skills.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Add Skill Input */}
                        <div className="flex gap-2">
                            <Input
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                placeholder="Add a skill"
                                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            />
                            <Button onClick={addSkill} size="sm" className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Skills List */}
                        <div className="flex flex-wrap gap-2">
                            {confirmedSkills.length > 0 ? (
                                confirmedSkills.map((skill, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="px-3 py-1 text-sm flex items-center gap-2 bg-[#E8C547]/10 text-[#E8C547] border-[#E8C547]/20"
                                    >
                                        {skill}
                                        <button
                                            onClick={() => removeSkill(skill)}
                                            className="hover:text-red-400"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-white/50">No skills confirmed yet</p>
                            )}
                        </div>

                        {/* Resume Summary */}
                        {parsedData.personalInfo && (
                            <div className="mt-6 p-4 bg-white/5 rounded-lg space-y-2 border border-white/10">
                                <h3 className="font-semibold text-white">Resume Summary</h3>
                                {parsedData.personalInfo.name && (
                                    <p className="text-sm text-white/60">
                                        <span className="font-medium text-white/80">Name:</span> {parsedData.personalInfo.name}
                                    </p>
                                )}
                                {parsedData.personalInfo.email && (
                                    <p className="text-sm text-white/60">
                                        <span className="font-medium text-white/80">Email:</span> {parsedData.personalInfo.email}
                                    </p>
                                )}
                                {parsedData.experience && parsedData.experience.length > 0 && (
                                    <p className="text-sm text-white/60">
                                        <span className="font-medium text-white/80">Experience:</span> {parsedData.experience.length} position(s)
                                    </p>
                                )}
                                {parsedData.education && parsedData.education.length > 0 && (
                                    <p className="text-sm text-white/60">
                                        <span className="font-medium text-white/80">Education:</span> {parsedData.education.length} entry/entries
                                    </p>
                                )}
                                {parsedData.atsScore && (
                                    <p className="text-sm text-white/60">
                                        <span className="font-medium text-white/80">ATS Score:</span> {parsedData.atsScore}/100
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setParsedData(null)
                                    setConfirmedSkills([])
                                    setResumeFile(null)
                                }}
                                disabled={saving}
                                className="border-white/10 text-white hover:bg-white/10"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveResume}
                                disabled={saving || confirmedSkills.length === 0}
                                className="flex-1 bg-[#E8C547] hover:bg-[#E8C547]/90 text-black"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        {hasResume ? 'Update Resume' : 'Save & Continue'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Alert */}
            {!hasResume && (
                <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-100">
                                <div className="font-semibold mb-1">Why Upload Your Resume?</div>
                                <div className="text-blue-200/80">
                                    Uploading your resume helps the system extract your skills and provide better assessment results. Without a resume, you may receive lower scores as the system cannot accurately match your skills to the assessment requirements.
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
