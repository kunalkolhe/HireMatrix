"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { Github, Linkedin, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data, error } = await signIn(email, password)

      if (error) throw error

      if (data.user) {
        const accountType = data.user.user_metadata?.account_type
        if (accountType === 'recruiter') {
          router.push('/recruiter/dashboard')
        } else {
          router.push('/candidate/dashboard')
        }
      }
    } catch (err: any) {
      console.error(err)
      setError("Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-[#0A0A0A]">
      {/* ========== LEFT: BRANDING ========== */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden border-r border-white/5">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E8C547]/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="AssessAI" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-semibold tracking-tight">AssessAI</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <blockquote className="space-y-6">
            <p className="text-3xl font-light text-white leading-relaxed">
              "AssessAI transformed our hiring. We went from guessing to <span className="text-white font-medium">knowing</span>."
            </p>
            <footer className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah" />
              </div>
              <div>
                <div className="font-medium text-white">Sarah Jenkins</div>
                <div className="text-white/40 text-sm">Head of Talent, TechFlow</div>
              </div>
            </footer>
          </blockquote>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 text-white/30 text-sm"
        >
          © 2026 AssessAI Inc.
        </motion.div>
      </div>

      {/* ========== RIGHT: FORM ========== */}
      <div className="flex-1 flex items-center justify-center p-8">
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
                <img src="/logo.png" alt="AssessAI" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-semibold text-white">AssessAI</span>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-light text-white tracking-tight">Welcome back</h1>
            <p className="text-white/40 mt-2">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60">Email address</Label>
              <Input
                id="email"
                type="email"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/60">Password</Label>
                <Link href="/forgot-password" className="text-sm text-[#E8C547] hover:text-[#f0d060]">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#E8C547] text-black font-semibold hover:bg-[#f0d060] rounded-xl transition-all"
            >
              {isLoading ? "Signing in..." : "Sign in"}
              {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0A0A0A] px-4 text-white/30">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              className="h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              <Linkedin className="mr-2 h-4 w-4 text-blue-400" />
              LinkedIn
            </Button>
          </div>

          <p className="text-center text-sm text-white/40">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#E8C547] hover:text-[#f0d060]">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
