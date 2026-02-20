"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Brain,
    Search,
    Building,
    Clock,
    FileText,
    Code,
    MessageSquare,
    ArrowRight,
    Briefcase
} from "lucide-react"

interface Job {
    id: string
    title: string
    company: string
    experience_level: string
    parsed_skills?: {
        technical: string[]
        tools: string[]
    }
    config: {
        mcq_count: number
        subjective_count: number
        coding_count: number
        duration_minutes: number
    }
    created_at: string
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        // Load jobs from localStorage (demo mode)
        const savedJobs = JSON.parse(localStorage.getItem('assessai_jobs') || '[]')
        setJobs(savedJobs)
    }, [])

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-xl fixed top-0 left-0 right-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#E8C547]/10 rounded-xl flex items-center justify-center border border-[#E8C547]/20">
                            <Brain className="w-6 h-6 text-[#E8C547]" />
                        </div>
                        <span className="text-2xl font-bold text-white">
                            AssessAI
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                                Login
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                Sign Up
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <Badge className="mb-4 bg-[#E8C547]/10 text-[#E8C547] border border-[#E8C547]/20">
                            <Briefcase className="w-3 h-3 mr-1" />
                            Open Positions
                        </Badge>
                        <h1 className="text-4xl font-bold text-white mb-4">Available Job Assessments</h1>
                        <p className="text-white/60 max-w-2xl mx-auto">
                            Take AI-powered assessments to showcase your skills and stand out to recruiters
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                        <Input
                            placeholder="Search jobs by title or company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 py-6 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-lg focus:border-[#E8C547]"
                        />
                    </div>

                    {/* Jobs List */}
                    {filteredJobs.length === 0 ? (
                        <Card className="bg-white/5 border-white/10">
                            <CardContent className="py-16 text-center">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Briefcase className="w-8 h-8 text-white/50" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">No jobs available</h3>
                                <p className="text-white/40">
                                    {jobs.length === 0
                                        ? "There are no open positions at the moment. Check back later!"
                                        : "No jobs match your search criteria."}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredJobs.map((job) => (
                                <Card key={job.id} className="bg-white/5 border-white/10 hover:border-[#E8C547]/50 transition-all duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h2 className="text-xl font-semibold text-white">{job.title}</h2>
                                                    <Badge className="bg-white/10 text-white/80 border-white/10 capitalize">
                                                        {job.experience_level}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
                                                    <span className="flex items-center gap-1">
                                                        <Building className="w-4 h-4" />
                                                        {job.company}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {job.config?.duration_minutes || 60} mins
                                                    </span>
                                                </div>

                                                {/* Skills */}
                                                {job.parsed_skills && (
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {[...job.parsed_skills.technical.slice(0, 3), ...job.parsed_skills.tools.slice(0, 2)].map((skill, i) => (
                                                            <Badge key={i} variant="secondary" className="bg-white/5 text-white/70 border-white/10">
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                        {(job.parsed_skills.technical.length + job.parsed_skills.tools.length) > 5 && (
                                                            <Badge variant="secondary" className="bg-white/5 text-white/50 border-white/10">
                                                                +{(job.parsed_skills.technical.length + job.parsed_skills.tools.length) - 5} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Assessment Info */}
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="flex items-center gap-1 text-blue-400">
                                                        <FileText className="w-4 h-4" />
                                                        {job.config?.mcq_count || 0} MCQs
                                                    </span>
                                                    <span className="flex items-center gap-1 text-purple-400">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {job.config?.subjective_count || 0} Subjective
                                                    </span>
                                                    <span className="flex items-center gap-1 text-green-400">
                                                        <Code className="w-4 h-4" />
                                                        {job.config?.coding_count || 0} Coding
                                                    </span>
                                                </div>
                                            </div>

                                            <Link href={`/test/${job.id}`}>
                                                <Button className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                                    Start Assessment
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
