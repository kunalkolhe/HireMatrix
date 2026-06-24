"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Video, MicOff, VideoOff, PhoneOff } from "lucide-react"

export default function InterviewPage() {
    const params = useParams()
    const router = useRouter()
    const interviewId = params.id as string

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-foreground flex flex-col">
            {/* Header */}
            <header className="border-b border-border p-4 sticky top-0 bg-[#0a0a0a] z-50">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold">Technical Interview</h1>
                            <p className="text-xs text-muted-foreground/70">ID: {interviewId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">Not Connected</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />

                <div className="relative z-10 max-w-md w-full bg-secondary backdrop-blur-sm border border-border rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                        <Video className="w-10 h-10 text-muted-foreground/70" />
                    </div>

                    <h2 className="text-2xl font-bold mb-3">Interview Scheduled</h2>
                    <p className="text-muted-foreground mb-8">
                        The video interview module is currently under maintenance.
                        Please return to the dashboard or contact your recruiter.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="flex flex-col items-center gap-2">
                            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-border bg-secondary hover:bg-secondary" disabled>
                                <MicOff className="w-5 h-5" />
                            </Button>
                            <span className="text-xs text-muted-foreground/70">Mute</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button variant="destructive" size="icon" className="w-12 h-12 rounded-full shadow-lg hover:bg-red-600" onClick={() => router.back()}>
                                <PhoneOff className="w-5 h-5" />
                            </Button>
                            <span className="text-xs text-muted-foreground/70">End Call</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-border bg-secondary hover:bg-secondary" disabled>
                                <VideoOff className="w-5 h-5" />
                            </Button>
                            <span className="text-xs text-muted-foreground/70">Camera</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70 border-t border-border pt-4">
                        <span>Powered by Agora (Pending Integration)</span>
                    </div>
                </div>
            </main>
        </div>
    )
}
