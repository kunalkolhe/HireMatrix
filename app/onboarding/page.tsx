"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Brain, Upload, Target, CheckCircle, ArrowRight, SkipForward } from "lucide-react"

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const router = useRouter()

  const steps = [
    { id: 1, title: "Welcome", description: "Let's get you started" },
    { id: 2, title: "Skills Assessment", description: "Tell us about your skills" },
    { id: 3, title: "Upload Resume", description: "Upload your resume for analysis" },
    { id: 4, title: "Learning Path", description: "Your personalized path is ready" },
  ]

  const skills = [
    "JavaScript", "Python", "Java", "React", "Node.js",
    "SQL", "HTML/CSS", "Data Analysis", "Machine Learning",
    "UI/UX Design", "Project Management", "Communication",
    "Problem Solving", "Leadership", "Teamwork"
  ]

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push("/candidate/dashboard")
    }
  }

  const handleSkip = () => {
    router.push("/candidate/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#E8C547]/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-3xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#E8C547]/10 rounded-xl flex items-center justify-center border border-[#E8C547]/20">
              <Brain className="w-6 h-6 text-[#E8C547]" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              AssessAI
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-white/60">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm font-medium text-[#E8C547]">{Math.round((currentStep / steps.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8C547] transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center border-b border-white/5 pb-8">
            <CardTitle className="text-3xl font-bold text-white mb-2">{steps[currentStep - 1].title}</CardTitle>
            <CardDescription className="text-white/50 text-lg">{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8 px-8">
            {currentStep === 1 && (
              <div className="text-center space-y-8">
                <div className="w-24 h-24 bg-[#E8C547]/10 rounded-full flex items-center justify-center mx-auto border border-[#E8C547]/20 animate-pulse">
                  <Target className="w-12 h-12 text-[#E8C547]" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-3">Welcome to AssessAI!</h3>
                  <p className="text-white/60 leading-relaxed">
                    We'll help you create a personalized learning path to achieve your career goals. This quick setup
                    will take just 2-3 minutes.
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  {[
                    { number: 1, text: "Assess Skills" },
                    { number: 2, text: "Upload Resume" },
                    { number: 3, text: "Start Learning" }
                  ].map((item) => (
                    <div key={item.number} className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold">
                        {item.number}
                      </div>
                      <p className="font-medium text-white/80">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center max-w-lg mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-2">Select Your Current Skills</h3>
                  <p className="text-white/60">
                    Choose the skills you're comfortable with. This helps us create your personalized learning path.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant={selectedSkills.includes(skill) ? "default" : "outline"}
                      className={`cursor-pointer p-3 text-center justify-center transition-all duration-200 ${selectedSkills.includes(skill)
                          ? "bg-[#E8C547] text-black border-[#E8C547] hover:bg-[#E8C547]/90"
                          : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      onClick={() => handleSkillToggle(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-white/40 text-center">Selected {selectedSkills.length} skills</p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center max-w-lg mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-2">Upload Your Resume</h3>
                  <p className="text-white/60">
                    Upload your resume for AI-powered analysis and personalized recommendations.
                  </p>
                </div>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-[#E8C547]/50 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#E8C547]/10 transition-colors">
                    <Upload className="w-8 h-8 text-white/40 group-hover:text-[#E8C547] transition-colors" />
                  </div>
                  <p className="text-lg font-medium text-white mb-2">Drag and drop your resume here</p>
                  <p className="text-sm text-white/40 mb-6">or click to browse files</p>
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">Choose File</Button>
                  <p className="text-xs text-white/30 mt-4">Supports PDF, DOC, DOCX (Max 5MB)</p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-8">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-3">You're All Set! 🎉</h3>
                  <p className="text-white/60 leading-relaxed">
                    Your personalized learning path has been created based on your profile and goals.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <h4 className="font-semibold text-white mb-4 text-left">Your Learning Path Includes:</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {[
                      "Aptitude Practice Tests",
                      "Coding Challenges",
                      "Interview Preparation",
                      "Resume Optimization"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3 text-white/80">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={handleSkip} className="text-white/40 hover:text-white hover:bg-white/5">
                Skip for now
              </Button>
              <Button
                onClick={handleNext}
                className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black px-8 font-medium"
              >
                {currentStep === steps.length ? "Go to Dashboard" : "Continue"}
                {currentStep !== steps.length && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
