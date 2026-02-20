"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Zap, Search, FileText, User, LogOut, Bell, Briefcase } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

const sidebarItems = [
    {
        title: "Find Jobs",
        href: "/candidate/dashboard",
        icon: Search
    },
    {
        title: "My Applications",
        href: "/candidate/achievements",
        icon: Briefcase
    },
    {
        title: "My Resume",
        href: "/candidate/resume",
        icon: FileText
    },
    {
        title: "My Profile",
        href: "/candidate/profile",
        icon: User
    }
]

export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { signOut, user } = useAuth()
    const [avatarUrl, setAvatarUrl] = useState("")

    useEffect(() => {
        if (!user) return

        const loadAvatar = async () => {
            // 1. Try Local Storage (Demo Fallback) - Highest priority for immediate updates
            const localAvatar = localStorage.getItem(`avatar_${user.id}`)
            if (localAvatar) {
                setAvatarUrl(localAvatar)
                return
            }

            // 2. Try User Metadata
            if (user.user_metadata?.avatar_url) {
                setAvatarUrl(user.user_metadata.avatar_url)
            }

            // 3. Try Supabase Profile (Background refresh)
            const { data } = await supabase
                .from('user_profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single()

            if (data?.avatar_url) {
                setAvatarUrl(data.avatar_url)
            }
        }

        loadAvatar()

        // Listen for storage events to update avatar immediately if changed in another tab/component
        const handleStorageChange = () => {
            const localAvatar = localStorage.getItem(`avatar_${user.id}`)
            if (localAvatar) setAvatarUrl(localAvatar)
        }

        window.addEventListener('storage', handleStorageChange)
        // Custom event for same-window updates
        window.addEventListener('avatar-updated', handleStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('avatar-updated', handleStorageChange)
        }
    }, [user])

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex">
            {/* ========== DARK SIDEBAR ========== */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0A0A0A] border-r border-white/5 z-50 flex flex-col">

                {/* Brand */}
                <div className="h-16 flex items-center px-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden">
                            <img src="/logo.png" alt="AssessAI" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-lg font-semibold text-white tracking-tight">
                            AssessAI
                        </span>
                    </Link>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-6 px-3 space-y-1">
                    <div className="px-3 mb-4 text-xs font-medium text-white/30 uppercase tracking-wider">
                        Main Menu
                    </div>
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        const Icon = item.icon

                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-white/10 text-white"
                                        : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}>
                                    <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/40")} />
                                    <span>{item.title}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signOut()}
                        className="w-full justify-center gap-2 bg-transparent border-white/10 text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* ========== MAIN CONTENT ========== */}
            <main className="flex-1 ml-64 min-h-screen">
                {/* Top Header */}
                <header className="h-16 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-40">
                    <h2 className="text-lg font-medium text-white">
                        Candidate Portal
                    </h2>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
                        </Button>
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden">
                            <img
                                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'User'}`}
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}


