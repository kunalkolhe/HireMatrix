"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Brain, LayoutDashboard, Plus, Users, FileText, Settings, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/recruiter/dashboard",
        icon: LayoutDashboard
    },
    {
        title: "Create Job",
        href: "/recruiter/jobs/new",
        icon: Plus
    },
    {
        title: "Candidates",
        href: "/recruiter/candidates",
        icon: Users
    },
    {
        title: "Reports",
        href: "/recruiter/reports",
        icon: FileText
    }
]

export function RecruiterSidebar() {
    const pathname = usePathname()
    const { signOut } = useAuth()

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r-2 border-black z-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b-2 border-black">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center border-2 border-transparent">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black uppercase tracking-tighter">
                        Skill<span className="text-primary">Zen</span>
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 mb-2">
                    Workspace
                </div>
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    const Icon = item.icon

                    return (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all font-bold mb-2",
                                isActive
                                    ? "bg-primary border-black text-white shadow-hard"
                                    : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-black"
                            )}>
                                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "fill-none")} />
                                <span>{item.title}</span>
                            </div>
                        </Link>
                    )
                })}

                <div className="mt-8 text-xs font-black text-gray-400 uppercase tracking-widest px-2 mb-2">
                    Settings
                </div>
                <Link href="/recruiter/settings">
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all font-bold mb-2",
                        pathname === "/recruiter/settings"
                            ? "bg-primary border-black text-white shadow-hard"
                            : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-black"
                    )}>
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </div>
                </Link>
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t-2 border-black bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-black text-sm border-2 border-black">
                        SZ
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
                <div>
                    <p className="text-sm font-black uppercase">Recruiter</p>
                    <p className="text-xs text-gray-500 truncate">Manage pipeline</p>
                </div>
            </div>
        </aside>
    )
}
