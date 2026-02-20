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
                    const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                    const foundJob = savedJobs.find((j: any) => j.id === assessmentId)
                    if (foundJob) {
                        setJob(foundJob)
                    }
                }
            } catch (error) {
                console.error('Error loading job:', error)
                const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
                const foundJob = savedJobs.find((j: any) => j.id === assessmentId)
                if (foundJob) {
                    setJob(foundJob)
                }
            }
        }

        loadJob()
    }, [assessmentId])

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-lg">
                <div className="pt-12 pb-8 px-8 text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-3">
                        Assessment Submitted Successfully!
                    </h2>

                    <p className="text-white/60 mb-8 text-lg">
                        Thank you for completing the assessment for <span className="font-semibold text-white">{job?.title}</span> at <span className="font-semibold text-white">{job?.company}</span>.
                    </p>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-8 text-left">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#E8C547]" />
                            What Happens Next?
                        </h3>
                        <ul className="space-y-3 text-sm text-white/70">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-white">Your responses are being evaluated</div>
                                    <div className="text-white/50">Our AI system is analyzing your answers and resume.</div>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-white">Recruiter will review your assessment</div>
                                    <div className="text-white/50">The hiring team will be notified and review your submission.</div>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-white">You'll hear back soon</div>
                                    <div className="text-white/50">If selected, the recruiter will contact you via email.</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="flex gap-4 justify-center">
                        {user ? (
                            <Button
                                onClick={() => router.push('/candidate/dashboard')}
                                className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black"
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Go to Dashboard
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => router.push('/')}
                                className="border-white/10 text-white hover:bg-white/10"
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
