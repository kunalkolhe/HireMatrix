"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, ArrowRight, ShieldCheck } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError("")

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message || "Failed to update password")
      return
    }

    router.replace("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E8C547]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#E8C547]/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#E8C547]/20">
            <ShieldCheck className="w-6 h-6 text-[#E8C547]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Secure Your Account</h1>
          <p className="text-white/50">Create a new strong password</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Reset Password</CardTitle>
            <CardDescription className="text-white/50">
              Enter and confirm your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Confirm new password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="w-full bg-[#E8C547] hover:bg-[#E8C547]/90 text-black font-medium"
            >
              {loading ? "Updating..." : "Update Password"}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
