"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Supabase will parse the URL hash and update the session automatically.
    // We just confirm the session exists, then redirect to dashboard.
    const finalizeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace("/dashboard")
        } else {
          router.replace("/login")
        }
      } catch (error) {
        console.error("Auth callback error", error)
        router.replace("/login")
      }
    }

    finalizeAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <p className="text-white">Signing you in...</p>
    </div>
  )
}
