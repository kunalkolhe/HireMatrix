"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Mail, MapPin, Briefcase, Save, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

export default function EditProfilePage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    location: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const { user: authUser, loading } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !authUser) {
      router.push("/login")
    }
  }, [authUser, loading, router])

  // Fetch user data on component mount
  useEffect(() => {
    if (authUser) {
      fetchUserData()
    }
  }, [authUser])

  const fetchUserData = async () => {
    try {
      setIsLoading(true)

      // First try to get data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role, location')
        .eq('id', authUser?.id)
        .single()

      let userData = {
        fullName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || "",
        email: authUser?.email || "",
        role: authUser?.user_metadata?.role || "",
        location: authUser?.user_metadata?.location || "",
      }

      // If profile data exists in database, use it (it's more up-to-date)
      if (profileData && !profileError) {
        userData = {
          fullName: profileData.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || "",
          email: authUser?.email || "",
          role: profileData.role || authUser?.user_metadata?.role || "",
          location: profileData.location || authUser?.user_metadata?.location || "",
        }
      } else {
        console.log("No profile data in database, using auth metadata")
      }

      setFormData(userData)
    } catch (err) {
      console.error("Error fetching user data:", err)
      setError("Failed to load user data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear any previous error/success messages
    setError("")
    setSuccess("")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      if (!authUser) {
        setError("User not authenticated")
        setIsSaving(false)
        return
      }

      // Update user metadata in Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          role: formData.role,
          location: formData.location
        }
      })

      if (updateError) {
        setError(updateError.message)
        setIsSaving(false)
        return
      }

      // Update profiles table in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          role: formData.role,
          location: formData.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)

      if (profileError) {
        console.error("Error updating profile in database:", profileError)
        setError("Profile updated in auth but failed to update database. Please try again.")
        setIsSaving(false)
        return
      }

      setSuccess("Profile updated successfully!")
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (err) {
      console.error("Error updating profile:", err)
      setError("An unexpected error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex items-center space-x-2 text-[#E8C547]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#E8C547]/10 rounded-lg flex items-center justify-center border border-[#E8C547]/20">
              <User className="w-6 h-6 text-[#E8C547]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
              <p className="text-white/60">Update your personal information and preferences</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <Card className="bg-white/5 border-white/10 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-white">Personal Information</CardTitle>
            <CardDescription className="text-white/50">
              Update your profile details below
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-white/70">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/70">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    className="pl-10 bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                    disabled
                  />
                </div>
                <p className="text-xs text-white/40">Email cannot be changed</p>
              </div>

              {/* Role and Location Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-white/70">
                    Target Role
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-white/40 z-10" />
                    <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                      <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#E8C547] focus:ring-[#E8C547]/20">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                        <SelectItem value="web-developer">Web Developer</SelectItem>
                        <SelectItem value="data-analyst">Data Analyst</SelectItem>
                        <SelectItem value="software-engineer">Software Engineer</SelectItem>
                        <SelectItem value="product-manager">Product Manager</SelectItem>
                        <SelectItem value="ui-ux-designer">UI/UX Designer</SelectItem>
                        <SelectItem value="business-analyst">Business Analyst</SelectItem>
                        <SelectItem value="devops-engineer">DevOps Engineer</SelectItem>
                        <SelectItem value="mobile-developer">Mobile Developer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-white/70">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#E8C547] focus:ring-[#E8C547]/20"
                      placeholder="Enter your city"
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6 bg-white/10" />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="bg-transparent border-white/10 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
