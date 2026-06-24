"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, FileText, Home, LayoutDashboard } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function SubmittedPage() {
    const params = useParams()
    const router = useRouter()
    const assessmentId = params.id as string
    const { user } = useAuth()
    const [job, setJob] = useState<any>(null)

    useEffect(() => {
        const exitFullscreen = async () => {
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
            }
        }

        exitFullscreen()

        const loadJob = async () => {
            try {
                const { getJobById } = await import('@/lib/jobService')
                const supabaseJob = await getJobById(assessmentId)

                if (supabaseJob) {
                    setJob({
                        id: supabaseJob.id,
                        title: supabaseJob.title,
                        company: supabaseJob.company || ''
                    })
                } else {
                    const savedJobs = JSON.parse(localStorage.getItem('hirematrix_jobs') || '[]')
                    const foundJob = savedJobs.find((j: any) => j.id === assessmentId)
                    if (foundJob) {
                        setJob(foundJob)
                    }
                }
            } catch (error) {
                console.error('Error loading job:', error)
                const savedJobs = JSON.parse(localStorage.getItem('hirematrix_jobs') || '[]')
                const foundJob = savedJobs.find((j: any) => j.id === assessmentId)
                if (foundJob) {
                    setJob(foundJob)
                }
            }
        }

        loadJob()
    }, [assessmentId])

    return (
        <div className="min-h-screen bg-[#0D1225] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-[#13163a] border border-white/10 rounded-lg">
                <div className="pt-12 pb-8 px-8 text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
                    </div>

                    <h2 className="text-3xl font-bold font-mono text-white mb-3">
                        Assessment Submitted Successfully!
                    </h2>

                    <p className="text-white/60 mb-8 text-lg">
                        Thank you for completing the assessment for <span className="font-semibold text-white">{job?.title}</span> at <span className="font-semibold text-white">{job?.company}</span>.
                    </p>

                    <div className="bg-primary/10 border border-blue-500/20 rounded-lg p-6 mb-8 text-left">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            What Happens Next?
                        </h3>
                        <ul className="space-y-3 text-sm text-white/60">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
                                <div>
                                    <div className="font-medium text-white">Your responses are being evaluated</div>
                                    <div className="text-white/40">Our AI system is analyzing your answers and resume.</div>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
                                <div>
                                    <div className="font-medium text-white">Recruiter will review your assessment</div>
                                    <div className="text-white/40">The hiring team will be notified and review your submission.</div>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
                                <div>
                                    <div className="font-medium text-white">You'll hear back soon</div>
                                    <div className="text-white/40">If selected, the recruiter will contact you via email.</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="flex gap-4 justify-center">
                        {user ? (
                            <Button
                                onClick={() => router.push('/candidate/dashboard')}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Go to Dashboard
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => router.push('/')}
                                className="border-white/10 text-white hover:bg-[#13163a]"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Go to Homepage
                            </Button>
                        )}
                    </div>

                    <p className="text-sm text-white/40 mt-6">
                        Your assessment has been securely saved. {user ? 'You can view it in your dashboard.' : 'You can close this page.'}
                    </p>
                </div>
            </div>
        </div>
    )
}
