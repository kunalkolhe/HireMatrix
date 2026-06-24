import type React from "react"
import type { Metadata } from "next"
import { Manrope, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ResumeProvider } from "./contexts/ResumeContext"
import { Toaster } from "@/components/ui/sonner"

const manrope = Manrope({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "HireMatrix - AI-Enabled Intelligent Assessment & Hiring Platform",
  description: "AI-powered assessment platform that eliminates fake applications and evaluates candidates based on job requirements.",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`dark ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
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
