import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ResumeProvider } from "./contexts/ResumeContext"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HireMatrix - AI-Enabled Intelligent Assessment & Hiring Platform",
  description: "AI-powered assessment platform that eliminates fake applications and evaluates candidates based on job requirements.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <AuthProvider>
          <ResumeProvider>
            {children}
            <Toaster />
          </ResumeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
