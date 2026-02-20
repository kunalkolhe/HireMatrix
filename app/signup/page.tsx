"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { Zap, User, Briefcase, ArrowRight, Check } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    accountType: "candidate" // 'candidate' | 'recruiter'
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { data, error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        account_type: formData.accountType,
        role: formData.accountType
      })

      if (error) throw error

      if (data.user) {
        if (formData.accountType === 'recruiter') {
          router.push('/recruiter/dashboard')
        } else {
          router.push('/candidate/dashboard')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-[#0A0A0A]">
      {/* ========== LEFT: BRANDING ========== */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden border-r border-white/5">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E8C547]/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-semibold tracking-tight">HireMatrix</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <h2 className="text-4xl font-light text-white mb-8">
            Join the future of <span className="text-white font-medium">hiring</span>
          </h2>
          <ul className="space-y-4">
            {[
              "AI-powered candidate screening",
              "Auto-generated role-specific assessments",
              "Bias-free, transparent evaluation",
              "Real-time analytics and insights"
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 text-white/60"
              >
                <div className="w-5 h-5 rounded-full bg-[#E8C547]/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#E8C547]" />
                </div>
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 flex gap-4 text-white/30 text-sm"
        >
          <a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-white/60 transition-colors">Terms of Service</a>
        </motion.div>
      </div>

      {/* ========== RIGHT: SIGNUP FORM ========== */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl overflow-hidden">
                <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-semibold text-white">HireMatrix</span>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-light text-white tracking-tight">Create an account</h1>
            <p className="text-white/40 mt-2">Start your free trial today</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {/* Account Type */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInputChange("accountType", "candidate")}
                className={`p-4 rounded-xl border text-left transition-all ${formData.accountType === 'candidate'
                  ? 'border-[#E8C547] bg-[#E8C547]/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
              >
                <div className={`p-2 w-fit rounded-lg mb-3 ${formData.accountType === 'candidate'
                  ? 'bg-[#E8C547] text-black'
                  : 'bg-white/10 text-white/60'
                  }`}>
                  <User className="w-5 h-5" />
                </div>
                <div className="font-medium text-sm text-white">Candidate</div>
                <div className="text-xs text-white/40 mt-1">I'm looking for a job</div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInputChange("accountType", "recruiter")}
                className={`p-4 rounded-xl border text-left transition-all ${formData.accountType === 'recruiter'
                  ? 'border-[#E8C547] bg-[#E8C547]/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
              >
                <div className={`p-2 w-fit rounded-lg mb-3 ${formData.accountType === 'recruiter'
                  ? 'bg-[#E8C547] text-black'
                  : 'bg-white/10 text-white/60'
                  }`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="font-medium text-sm text-white">Recruiter</div>
                <div className="text-xs text-white/40 mt-1">I want to hire talent</div>
              </motion.button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white/60">Full Name</Label>
                <Input
                  id="fullName"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/60">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/60">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#E8C547] text-black font-semibold hover:bg-[#f0d060] rounded-xl transition-all"
            >
              {isLoading ? "Creating account..." : "Create Account"}
              {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>

          <p className="text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#E8C547] hover:text-[#f0d060]">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
