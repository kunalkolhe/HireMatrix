"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Zap, LayoutDashboard, Plus, Users, FileText, BarChart3, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/recruiter/dashboard",
        icon: LayoutDashboard
    },
    {
        title: "Assessments",
        href: "/recruiter/jobs/new",
        icon: FileText
    },
    {
        title: "Candidates",
        href: "/recruiter/candidates",
        icon: Users
    },
    {
        title: "Analytics",
        href: "/recruiter/analytics",
        icon: BarChart3
    }
]

export default function RecruiterLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, signOut, loading } = useAuth()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login")
            } else if (user.user_metadata?.role === 'candidate' || user.user_metadata?.account_type === 'candidate') {
                // Route protection: If user is candidate, redirect to candidate dashboard
                window.location.href = '/candidate/dashboard'
            }
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0D1225]">
                <div className="w-14 h-14 rounded-xl overflow-hidden animate-pulse">
                    <img src="/logo.png" alt="HireMatrix" className="w-full h-full object-cover" />
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

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
                        Recruitment
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

                {/* Footer User Profile */}
                <div className="p-4 border-t border-white/8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full ring-2 ring-primary/40 bg-[#13163a] flex items-center justify-center text-white font-semibold text-sm">
                            R
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">Recruiter</p>
                            <p className="text-xs text-white/30 truncate">Workspace</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            await signOut()
                        }}
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
                        {pathname.split('/').pop()?.charAt(0).toUpperCase()}{pathname.split('/').pop()?.slice(1)}
                    </h2>
                    <div className="flex items-center gap-4">
                        <Link href="/recruiter/settings">
                            <Button variant="ghost" size="icon" className="text-white/30 hover:text-white hover:bg-white/5">
                                <Settings className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
