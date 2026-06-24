"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Zap, Search, FileText, User, LogOut, Bell, Briefcase } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    const [notifications, setNotifications] = useState<any[]>([])

    useEffect(() => {
        const checkNotifications = () => {
            if (user?.id) {
                const stored = localStorage.getItem(`notifications_${user?.id}`)
                if (stored) {
                    setNotifications(JSON.parse(stored))
                }
            }
        }
        
        checkNotifications()
        window.addEventListener('storage', checkNotifications)
        window.addEventListener('notificationUpdate', checkNotifications)
        return () => {
            window.removeEventListener('storage', checkNotifications)
            window.removeEventListener('notificationUpdate', checkNotifications)
        }
    }, [user?.id])

    const markAllRead = () => {
        const updated = notifications.map(n => ({...n, read: true}))
        setNotifications(updated)
        if (user?.id) {
            localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated))
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length

    useEffect(() => {
        if (!user) return

        // Route protection: If user is recruiter, redirect to recruiter dashboard
        if (user.user_metadata?.role === 'recruiter' || user.user_metadata?.account_type === 'recruiter') {
            window.location.href = '/recruiter/dashboard'
            return
        }

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
        <div className="min-h-screen bg-[#0D1225] flex">
            {/* ========== DARK SIDEBAR ========== */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#080C18] border-r border-white/8 z-50 flex flex-col">

                {/* Brand */}
                <div className="h-16 flex items-center px-6 border-b border-white/8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden">
                            <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-lg font-semibold text-white font-bold tracking-tight">
                            HireMatrix
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
                                        ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                                        : "text-white/50 hover:text-white hover:bg-white/6"
                                )}>
                                    <Icon className="w-5 h-5 text-current" />
                                    <span>{item.title}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/8">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signOut()}
                        className="w-full justify-center gap-2 bg-transparent border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* ========== MAIN CONTENT ========== */}
            <main className="flex-1 ml-64 min-h-screen">
                {/* Top Header */}
                <header className="h-16 bg-[#080C18] border-b border-white/8 flex items-center justify-between px-8 sticky top-0 z-40">
                    <h2 className="text-lg font-medium text-white">
                        Candidate Portal
                    </h2>
                    <div className="flex items-center gap-4">
                        {/* Notifications Dropdown */}
                        <DropdownMenu onOpenChange={(open) => { if (open && unreadCount > 0) markAllRead() }}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white/30 hover:text-white hover:bg-white/5 relative outline-none focus:ring-1 focus:ring-primary/50">
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 border border-[#080C18]" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80 bg-[#0D1225] border-white/10 text-white shadow-2xl max-h-96 overflow-y-auto">
                                <DropdownMenuLabel className="font-semibold text-white">Notifications</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                {notifications.length > 0 ? (
                                    <div className="flex flex-col">
                                        {notifications.map((n) => (
                                            <div key={n.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <p className="text-sm font-medium text-white mb-1">{n.title}</p>
                                                <p className="text-xs text-white/60 mb-2">{n.text}</p>
                                                <p className="text-[10px] text-white/30">{new Date(n.date).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-white/50 text-sm flex flex-col items-center justify-center">
                                        <Bell className="w-8 h-8 mb-3 opacity-20" />
                                        You have no new notifications.
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* User Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 rounded-full bg-[#13163a] ring-2 ring-primary/30 overflow-hidden outline-none focus:ring-primary/60 transition-all cursor-pointer hover:ring-primary">
                                    <img
                                        src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'User'}`}
                                        alt="User"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0D1225] border-white/10 text-white shadow-2xl">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none text-white">My Account</p>
                                        <p className="text-xs leading-none text-white/50">
                                            {user?.email || 'user@example.com'}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                    <Link href="/candidate/profile" className="w-full flex items-center">
                                        <User className="w-4 h-4 mr-2 text-white/50" />
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                    <Link href="/candidate/resume" className="w-full flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-white/50" />
                                        Resume
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => signOut()} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}


