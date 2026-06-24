"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, User, Bell, Key, CreditCard, Shield } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

export default function SettingsPage() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('profile')
    const [isSaving, setIsSaving] = useState(false)

    // Dummy state for form
    const [name, setName] = useState(user?.user_metadata?.full_name || "Recruiter")
    const [email, setEmail] = useState(user?.email || "")
    const [company, setCompany] = useState("Acme Corp")
    const [apiKey, setApiKey] = useState("sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx")

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => {
            setIsSaving(false)
            toast.success("Settings saved successfully!")
        }, 800)
    }

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'preferences', label: 'Preferences', icon: Bell },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'billing', label: 'Billing', icon: CreditCard }
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
                <p className="text-white/40 mt-2">Manage your account preferences, API keys, and billing details.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <Card className="bg-[#13163a] border-white/10 md:w-64 h-fit shrink-0 backdrop-blur-xl">
                    <CardContent className="p-4 space-y-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                                        isActive 
                                        ? 'bg-primary/20 text-primary border border-primary/20' 
                                        : 'text-white/50 hover:bg-white/5 hover:text-white border border-transparent'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6">
                    {activeTab === 'profile' && (
                        <Card className="bg-[#13163a] border-white/10 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-xl text-white">Profile Information</CardTitle>
                                <CardDescription className="text-white/40">Update your personal details and company information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-white/60">Full Name</Label>
                                    <Input 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-[#0D1225] border-white/10 text-white h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/60">Email Address</Label>
                                    <Input 
                                        type="email"
                                        value={email} 
                                        disabled
                                        className="bg-[#0D1225] border-white/10 text-white/50 h-12 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-white/30">Email cannot be changed directly. Contact support to change your email.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/60">Company Name</Label>
                                    <Input 
                                        value={company} 
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="bg-[#0D1225] border-white/10 text-white h-12"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'preferences' && (
                        <Card className="bg-[#13163a] border-white/10 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-xl text-white">Notification Preferences</CardTitle>
                                <CardDescription className="text-white/40">Choose what updates you want to receive.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    { title: "New Candidate Applications", desc: "Receive an email when a candidate completes an assessment." },
                                    { title: "Weekly Report", desc: "A weekly summary of your job postings and candidate metrics." },
                                    { title: "Product Updates", desc: "News about new features and improvements to HireMatrix." }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-white/10 bg-[#0D1225]">
                                        <div className="space-y-1 pr-6">
                                            <p className="font-medium text-white">{item.title}</p>
                                            <p className="text-sm text-white/40">{item.desc}</p>
                                        </div>
                                        {/* Simple toggle UI mock */}
                                        <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                                            <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'api' && (
                        <Card className="bg-[#13163a] border-white/10 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    AI API Integration
                                </CardTitle>
                                <CardDescription className="text-white/40">
                                    Bring your own OpenRouter API key to power the AI assessments.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-white/60">OpenRouter API Key</Label>
                                    <Input 
                                        type="password"
                                        value={apiKey} 
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="bg-[#0D1225] border-white/10 text-white h-12 font-mono"
                                    />
                                    <p className="text-xs text-white/40">
                                        Your key is securely stored and never shared. We recommend setting a usage limit on your OpenRouter dashboard.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'billing' && (
                        <Card className="bg-[#13163a] border-white/10 backdrop-blur-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 p-8 border-b border-white/10">
                                <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">Pro Plan</Badge>
                                <h3 className="text-3xl font-bold text-white mb-2">$49<span className="text-xl text-white/50 font-normal">/month</span></h3>
                                <p className="text-white/60">Next billing date is July 24, 2026</p>
                            </div>
                            <CardContent className="p-6">
                                <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/5">
                                    Manage Subscription
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Global Save Button */}
                    <div className="flex justify-end pt-4">
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 text-base"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving Changes..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
