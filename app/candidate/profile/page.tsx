"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { User, MapPin, Mail, Github, Linkedin, Globe, Pencil, Plus, Save, X, Camera, Upload } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface ProfileData {
    full_name: string
    company: string
    location: string
    bio: string
    linkedin_url: string
    github_url: string
    website_url: string
    skills: string[]
    languages: { name: string; level: string }[]
    avatar_url?: string
}

export default function ProfilePage() {
    const { user } = useAuth()
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState<ProfileData>({
        full_name: '',
        company: '',
        location: '',
        bio: '',
        linkedin_url: '',
        github_url: '',
        website_url: '',
        skills: [],
        languages: [],
        avatar_url: ''
    })
    const [newSkill, setNewSkill] = useState("")
    const [newLanguage, setNewLanguage] = useState({ name: "", level: "Professional" })
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) {
                setLoading(false)
                return
            }

            try {
                // Load from user_profiles table
                const { data: profileData, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Error loading profile:', error)
                }

                // Get user metadata from auth
                const userMetadata = user.user_metadata || {}

                // Set profile data
                setProfile({
                    full_name: profileData?.full_name || userMetadata.full_name || user.email?.split('@')[0] || '',
                    company: profileData?.company || userMetadata.company || '',
                    location: userMetadata.location || '',
                    bio: userMetadata.bio || '',
                    linkedin_url: userMetadata.linkedin_url || '',
                    github_url: userMetadata.github_url || '',
                    website_url: userMetadata.website_url || '',
                    skills: userMetadata.skills || [],
                    languages: userMetadata.languages || [],
                    avatar_url: profileData?.avatar_url || userMetadata.avatar_url || ''
                })
                if (profileData?.avatar_url) {
                    setPhotoPreview(profileData.avatar_url)
                }
            } catch (error) {
                console.error('Error loading profile:', error)
                // Set defaults from user metadata
                const userMetadata = user.user_metadata || {}
                setProfile({
                    full_name: userMetadata.full_name || user.email?.split('@')[0] || '',
                    company: userMetadata.company || '',
                    location: userMetadata.location || '',
                    bio: userMetadata.bio || '',
                    linkedin_url: userMetadata.linkedin_url || '',
                    github_url: userMetadata.github_url || '',
                    website_url: userMetadata.website_url || '',
                    skills: userMetadata.skills || [],
                    languages: userMetadata.languages || [],
                    avatar_url: userMetadata.avatar_url || ''
                })
                if (userMetadata.avatar_url) {
                    setPhotoPreview(userMetadata.avatar_url)
                }
            } finally {
                // Check for local avatar override (from fallback mechanism)
                if (user?.id) {
                    const localAvatar = localStorage.getItem(`avatar_${user.id}`);
                    if (localAvatar) {
                        setProfile(prev => ({ ...prev, avatar_url: localAvatar }));
                        setPhotoPreview(localAvatar);
                    }
                }
                setLoading(false)
            }
        }

        loadProfile()
    }, [user])

    const handleSave = async () => {
        if (!user?.id) {
            toast.error('Please log in to save your profile')
            return
        }

        setSaving(true)
        try {
            // Update user_profiles table
            const { error: profileError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: user.id,
                    full_name: profile.full_name,
                    company: profile.company,
                    avatar_url: profile.avatar_url || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                })

            if (profileError) {
                console.error('Error updating profile:', profileError)
                toast.error('Failed to update profile')
                setSaving(false)
                return
            }

            // Update auth user metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.full_name,
                    company: profile.company,
                    location: profile.location,
                    bio: profile.bio,
                    linkedin_url: profile.linkedin_url,
                    github_url: profile.github_url,
                    website_url: profile.website_url,
                    skills: profile.skills,
                    languages: profile.languages,
                    // Only save avatar to auth metadata if it's a remote URL (not a base64 data string)
                    // This prevents "metadata size exceeded" errors
                    avatar_url: profile.avatar_url?.startsWith('data:') ? undefined : profile.avatar_url
                }
            })

            if (authError) {
                console.error('Error updating auth metadata:', authError)
                toast.error('Profile updated but metadata update failed')
            } else {
                toast.success('Profile updated successfully!')
                setIsEditing(false)
            }
        } catch (error) {
            console.error('Error saving profile:', error)
            toast.error('Failed to save profile')
        } finally {
            setSaving(false)
        }
    }

    const addSkill = () => {
        if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
            setProfile({
                ...profile,
                skills: [...profile.skills, newSkill.trim()]
            })
            setNewSkill("")
        }
    }

    const removeSkill = (skill: string) => {
        setProfile({
            ...profile,
            skills: profile.skills.filter(s => s !== skill)
        })
    }

    const addLanguage = () => {
        if (newLanguage.name.trim()) {
            setProfile({
                ...profile,
                languages: [...profile.languages, { ...newLanguage }]
            })
            setNewLanguage({ name: "", level: "Professional" })
        }
    }

    const removeLanguage = (index: number) => {
        setProfile({
            ...profile,
            languages: profile.languages.filter((_, i) => i !== index)
        })
    }

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB')
            return
        }

        setUploadingPhoto(true)

        try {
            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${user?.id}-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // Upload file
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) {
                // If bucket doesn't exist, try to create it or use public URL
                console.error('Upload error:', uploadError)

                // Fallback: Use object URL/Base64 for now (user will need to create bucket)
                if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('row level security policy') || uploadError.message.includes('The resource was not found')) {
                    console.warn('Supabase storage not configured, falling back to local storage');

                    // Use the reader result we already have
                    if (reader.result) {
                        const base64 = reader.result as string;
                        // Save to local storage directly using a unique key for the user
                        localStorage.setItem(`avatar_${user?.id}`, base64);

                        // Dispatch event to update header immediately
                        window.dispatchEvent(new Event('avatar-updated'));

                        // Update state immediately
                        setProfile(prev => ({ ...prev, avatar_url: base64 }));
                        setPhotoPreview(base64);

                        toast.warning('Storage bucket missing. Saved photo locally (Demo Mode).');
                    }

                    setUploadingPhoto(false);
                    return;
                }

                throw uploadError
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const avatarUrl = urlData.publicUrl

            // Update profile state
            setProfile({
                ...profile,
                avatar_url: avatarUrl
            })

            toast.success('Photo uploaded successfully! Click Save to update your profile.')
        } catch (error) {
            console.error('Error uploading photo:', error)
            toast.error('Failed to upload photo. Please try again.')
            setPhotoPreview(null)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleRemovePhoto = () => {
        setProfile({
            ...profile,
            avatar_url: ''
        })
        setPhotoPreview(null)
        toast.info('Photo removed. Click Save to update your profile.')
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#E8C547] border-t-transparent" />
            </div>
        )
    }

    const avatarSeed = profile.full_name || user?.email || 'user'
    const displayName = profile.full_name || user?.email?.split('@')[0] || 'User'
    const displayEmail = user?.email || ''

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* ========== PROFILE HEADER ========== */}
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-[#E8C547]/30 to-amber-600/20" />

                <div className="px-8 pb-8">
                    <div className="flex justify-between items-start -mt-12 mb-6">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-[#0A0A0A] bg-[#0A0A0A] shadow-sm overflow-hidden relative">
                                {photoPreview || profile.avatar_url ? (
                                    <img
                                        src={photoPreview || profile.avatar_url || ''}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {isEditing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        {uploadingPhoto ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Camera className="w-6 h-6 text-white" />
                                                <span className="text-xs text-white font-medium">Change Photo</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isEditing && (
                                <label className="absolute inset-0 cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                        disabled={uploadingPhoto}
                                    />
                                </label>
                            )}
                            {isEditing && (photoPreview || profile.avatar_url) && (
                                <button
                                    onClick={handleRemovePhoto}
                                    className="absolute -bottom-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg z-10"
                                    title="Remove photo"
                                    type="button"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="mt-14">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <Button onClick={handleSave} disabled={saving} className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                        <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving} className="border-white/10 text-white hover:bg-white/10">
                                        <X className="w-4 h-4 mr-2" /> Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="outline" onClick={() => setIsEditing(true)} className="border-white/10 text-white hover:bg-white/10">
                                    <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                                </Button>
                            )}
                        </div>
                    </div>

                    <div>
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="full_name" className="text-white/70">Full Name</Label>
                                    <Input
                                        id="full_name"
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        placeholder="Enter your full name"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="company" className="text-white/70">Company / Title</Label>
                                    <Input
                                        id="company"
                                        value={profile.company}
                                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                        placeholder="e.g., Senior Developer at TechFlow"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                                <p className="text-lg text-white/60">{profile.company || 'No title set'}</p>
                            </>
                        )}

                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-white/50">
                            {isEditing ? (
                                <div className="w-full">
                                    <Label htmlFor="location" className="text-white/70">Location</Label>
                                    <Input
                                        id="location"
                                        value={profile.location}
                                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                        placeholder="e.g., San Francisco, CA"
                                        className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                            ) : (
                                profile.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" /> {profile.location}
                                    </span>
                                )
                            )}
                            <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" /> {displayEmail}
                            </span>
                            {!isEditing && profile.linkedin_url && (
                                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#E8C547]">
                                    <Linkedin className="w-4 h-4" /> LinkedIn
                                </a>
                            )}
                            {!isEditing && profile.github_url && (
                                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#E8C547]">
                                    <Github className="w-4 h-4" /> GitHub
                                </a>
                            )}
                            {!isEditing && profile.website_url && (
                                <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#E8C547]">
                                    <Globe className="w-4 h-4" /> Website
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="md:col-span-2 space-y-6">
                    {/* About */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">About</h2>
                        </div>
                        {isEditing ? (
                            <Textarea
                                value={profile.bio}
                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                placeholder="Tell us about yourself..."
                                className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/40"
                            />
                        ) : (
                            <p className="text-white/60 leading-relaxed">
                                {profile.bio || 'No bio added yet. Click Edit Profile to add one.'}
                            </p>
                        )}
                    </div>

                    {/* Social Links (Editing Mode) */}
                    {isEditing && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Social Links</h2>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="linkedin_url" className="text-white/70">LinkedIn URL</Label>
                                    <Input
                                        id="linkedin_url"
                                        value={profile.linkedin_url}
                                        onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                                        placeholder="https://linkedin.com/in/yourprofile"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="github_url" className="text-white/70">GitHub URL</Label>
                                    <Input
                                        id="github_url"
                                        value={profile.github_url}
                                        onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                                        placeholder="https://github.com/yourusername"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="website_url" className="text-white/70">Website URL</Label>
                                    <Input
                                        id="website_url"
                                        value={profile.website_url}
                                        onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                                        placeholder="https://yourwebsite.com"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Skills */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">Skills</h2>
                        </div>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                        placeholder="Add a skill"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                    <Button onClick={addSkill} size="sm" className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-[#E8C547]/10 text-[#E8C547] rounded-full text-sm font-medium flex items-center gap-2">
                                            {skill}
                                            <button onClick={() => removeSkill(skill)} className="hover:text-red-400">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.skills.length > 0 ? (
                                    profile.skills.map((skill, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-white/10 text-white/70 rounded-full text-sm font-medium">
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-white/50">No skills added yet</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Languages */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">Languages</h2>
                        </div>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        value={newLanguage.name}
                                        onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                                        placeholder="Language name"
                                        className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                    <select
                                        value={newLanguage.level}
                                        onChange={(e) => setNewLanguage({ ...newLanguage, level: e.target.value })}
                                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white"
                                        style={{ colorScheme: 'dark' }}
                                    >
                                        <option value="Native" className="bg-[#0A0A0A]">Native</option>
                                        <option value="Professional" className="bg-[#0A0A0A]">Professional</option>
                                        <option value="Conversational" className="bg-[#0A0A0A]">Conversational</option>
                                        <option value="Basic" className="bg-[#0A0A0A]">Basic</option>
                                    </select>
                                    <Button onClick={addLanguage} size="sm" className="bg-[#E8C547] hover:bg-[#E8C547]/90 text-black">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    {profile.languages.map((lang, idx) => (
                                        <li key={idx} className="flex justify-between items-center">
                                            <span className="text-white font-medium">{lang.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/50">{lang.level}</span>
                                                <button onClick={() => removeLanguage(idx)} className="text-red-400 hover:text-red-300">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {profile.languages.length > 0 ? (
                                    profile.languages.map((lang, idx) => (
                                        <li key={idx} className="flex justify-between">
                                            <span className="text-white font-medium">{lang.name}</span>
                                            <span className="text-white/50">{lang.level}</span>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-sm text-white/50">No languages added yet</p>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
