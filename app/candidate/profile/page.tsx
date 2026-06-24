"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { User, MapPin, Mail, Github, Linkedin, Globe, Pencil, Plus, Save, X, Camera, Upload, CheckCircle, Briefcase, Book } from "lucide-react"
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
    const [showAllSkills, setShowAllSkills] = useState(false)

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
            // 1. Update auth user metadata (Primary source of truth for candidate details)
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
                toast.error('Failed to save profile details')
                setSaving(false)
                return
            }

            // 2. Try to update user_profiles table (Secondary/fallback)
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
                // Just log it, don't fail the whole save since metadata was already saved
                console.warn('Could not update user_profiles table (might not exist):', profileError)
            }

            toast.success('Profile updated successfully!')
            setIsEditing(false)
            
            // Dispatch event to update avatar across tabs
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('avatar-updated'))
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
            const filePath = `${fileName}`

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
            const newProfile = {
                ...profile,
                avatar_url: avatarUrl
            };
            setProfile(newProfile);

            // Auto-save the new avatar immediately
            try {
                await supabase
                    .from('user_profiles')
                    .upsert({
                        id: user?.id,
                        full_name: newProfile.full_name,
                        company: newProfile.company,
                        avatar_url: avatarUrl,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                await supabase.auth.updateUser({
                    data: {
                        avatar_url: avatarUrl
                    }
                });
            } catch (e) {
                console.error("Failed to auto-save avatar", e);
            }

            // Dispatch event to update header immediately
            window.dispatchEvent(new Event('avatar-updated'));

            toast.success('Photo uploaded and saved successfully!')
        } catch (error) {
            console.error('Error uploading photo:', error)
            toast.error('Failed to upload photo. Please try again.')
            setPhotoPreview(null)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleRemovePhoto = async () => {
        const newProfile = {
            ...profile,
            avatar_url: ''
        };
        setProfile(newProfile)
        setPhotoPreview(null)

        // Auto-save the removal
        if (user?.id) {
            try {
                await supabase
                    .from('user_profiles')
                    .upsert({
                        id: user.id,
                        full_name: newProfile.full_name,
                        company: newProfile.company,
                        avatar_url: null,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                await supabase.auth.updateUser({
                    data: {
                        avatar_url: null
                    }
                });
            } catch (e) {
                console.error("Failed to auto-save avatar removal", e);
            }
        }
        
        // Dispatch event to update header immediately
        window.dispatchEvent(new Event('avatar-updated'));

        toast.info('Photo removed successfully!')
    }

    const calculateProfileStrength = () => {
        let score = 0;
        let checks = {
            name: !!profile.full_name,
            bio: !!profile.bio,
            skills: profile.skills && profile.skills.length > 0,
            languages: profile.languages && profile.languages.length > 0,
            location: !!profile.location
        };
        
        if (checks.name) score += 20;
        if (checks.bio) score += 20;
        if (checks.skills) score += 20;
        if (checks.languages) score += 20;
        if (checks.location) score += 20;
        
        return { score, checks };
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Skeleton Header */}
                <div className="bg-white/5 animate-pulse rounded-2xl h-48 w-full" />
                {/* Skeleton Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 animate-pulse rounded-xl h-24" />
                    <div className="bg-white/5 animate-pulse rounded-xl h-24" />
                    <div className="bg-white/5 animate-pulse rounded-xl h-24" />
                </div>
                {/* Skeleton Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 animate-pulse rounded-2xl h-40" />
                        <div className="bg-white/5 animate-pulse rounded-2xl h-40" />
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/5 animate-pulse rounded-2xl h-32" />
                        <div className="bg-white/5 animate-pulse rounded-2xl h-32" />
                    </div>
                </div>
            </div>
        )
    }

    const avatarSeed = profile.full_name || user?.email || 'user'
    const displayName = profile.full_name || user?.email?.split('@')[0] || 'User'
    const displayEmail = user?.email || ''
    const { score, checks } = calculateProfileStrength()

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            {/* ========== 1. PROFILE HEADER CARD ========== */}
            <div className="bg-[#13163a] border border-white/10 rounded-2xl overflow-hidden relative">
                {/* Gradient Banner */}
                <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-transparent h-24 rounded-t-2xl w-full" />
                
                <div className="p-6 pt-0">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start relative -mt-10 gap-4">
                        {/* Avatar & Info */}
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                            {/* Avatar */}
                            <div className="relative group shrink-0">
                                <div className="w-20 h-20 rounded-full ring-4 ring-primary/30 bg-[#13163a] flex items-center justify-center overflow-hidden">
                                    {photoPreview || profile.avatar_url ? (
                                        <img
                                            src={photoPreview || profile.avatar_url || ''}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl font-bold text-primary uppercase">
                                            {displayName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                {/* Change Photo Hover */}
                                {true && (
                                    <label className="absolute inset-0 cursor-pointer rounded-full overflow-hidden">
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {uploadingPhoto ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                            ) : (
                                                <Camera className="w-5 h-5 text-white" />
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                )}
                                {/* Remove Photo */}
                                {(photoPreview || profile.avatar_url) && (
                                    <button
                                        onClick={handleRemovePhoto}
                                        className="absolute -bottom-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg z-10"
                                        title="Remove photo"
                                        type="button"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Info */}
                            <div className="text-center md:text-left mt-2 md:mt-12">
                                <h1 className="text-2xl font-extrabold text-white">{displayName}</h1>
                                <p className="text-white/60 text-sm font-medium">{profile.company || 'Professional'}</p>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                                    {profile.location && (
                                        <span className="flex items-center gap-1.5 text-white/50 text-sm">
                                            <MapPin className="w-4 h-4" /> {profile.location}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5 text-white/50 text-sm">
                                        <Mail className="w-4 h-4" /> {displayEmail}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                                    {profile.linkedin_url && (
                                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/50 hover:text-primary text-sm transition-colors">
                                            <Linkedin className="w-4 h-4" /> LinkedIn
                                        </a>
                                    )}
                                    {profile.github_url && (
                                        <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/50 hover:text-primary text-sm transition-colors">
                                            <Github className="w-4 h-4" /> GitHub
                                        </a>
                                    )}
                                    {profile.website_url && (
                                        <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/50 hover:text-primary text-sm transition-colors">
                                            <Globe className="w-4 h-4" /> Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Right Action Button */}
                        <div className="md:mt-12">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button onClick={handleSave} disabled={saving} className="border border-primary/50 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2">
                                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button onClick={() => setIsEditing(false)} disabled={saving} className="border border-white/15 text-white/70 hover:text-white hover:border-white/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="border border-white/15 text-white/70 hover:text-white hover:border-white/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2">
                                    <Pencil className="w-4 h-4" /> Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* EDITING MODE INPUTS */}
                    {isEditing && (
                        <div className="mt-8 border-t border-white/10 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="full_name" className="text-white/60 text-xs">Full Name</Label>
                                <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Enter your full name" className="bg-[#13163a] border-white/10 text-white placeholder:text-white/40 mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="company" className="text-white/60 text-xs">Company / Title</Label>
                                <Input id="company" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="e.g., Senior Developer at TechFlow" className="bg-[#13163a] border-white/10 text-white placeholder:text-white/40 mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="location" className="text-white/60 text-xs">Location</Label>
                                <Input id="location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="e.g., San Francisco, CA" className="bg-[#13163a] border-white/10 text-white placeholder:text-white/40 mt-1" />
                            </div>
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="linkedin_url" className="text-white/60 text-xs">LinkedIn URL</Label>
                                    <Input id="linkedin_url" value={profile.linkedin_url} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/..." className="bg-[#13163a] border-white/10 text-white placeholder:text-white/40 mt-1" />
                                </div>
                                <div>
                                    <Label htmlFor="github_url" className="text-white/60 text-xs">GitHub URL</Label>
                                    <Input id="github_url" value={profile.github_url} onChange={(e) => setProfile({ ...profile, github_url: e.target.value })} placeholder="https://github.com/..." className="bg-[#13163a] border-white/10 text-white placeholder:text-white/40 mt-1" />
                                </div>
                                <div>
                                    <Label htmlFor="website_url" className="text-white/60 text-xs">Website URL</Label>
                                    <Input id="website_url" value={profile.website_url} onChange={(e) => setProfile({ ...profile, website_url: e.target.value })} placeholder="https://yourwebsite.com" className="bg-[#13163a] border-white/10 text-white placeholder:text-white/40 mt-1" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== 7. STATS ROW ========== */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#13163a] border border-white/10 rounded-xl p-3 md:p-4 text-center">
                    <div className="text-2xl font-extrabold text-white font-mono">0</div>
                    <div className="text-white/40 text-xs font-medium mt-1">Applications Sent</div>
                </div>
                <div className="bg-[#13163a] border border-white/10 rounded-xl p-3 md:p-4 text-center">
                    <div className="text-2xl font-extrabold text-white font-mono">0</div>
                    <div className="text-white/40 text-xs font-medium mt-1">Assessments Taken</div>
                </div>
                <div className="bg-[#13163a] border border-white/10 rounded-xl p-3 md:p-4 text-center">
                    <div className="text-2xl font-extrabold text-primary font-mono">--</div>
                    <div className="text-white/40 text-xs font-medium mt-1">Avg Score</div>
                </div>
            </div>

            {/* ========== 2. TWO COLUMN GRID ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (About, Experience, Education) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* ========== 3. ABOUT SECTION ========== */}
                    <div className="bg-[#13163a] border border-white/10 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            About
                        </h2>
                        {isEditing ? (
                            <Textarea
                                value={profile.bio}
                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                placeholder="Tell recruiters about yourself..."
                                className="min-h-[120px] bg-[#0a0c27] border-white/10 text-white placeholder:text-white/40 mt-2"
                            />
                        ) : (
                            profile.bio ? (
                                <p className="text-white/60 text-sm leading-relaxed capitalize whitespace-pre-wrap">
                                    {profile.bio.toLowerCase()}
                                </p>
                            ) : (
                                <p className="text-white/30 text-sm italic">No bio added yet. Tell recruiters about yourself.</p>
                            )
                        )}
                    </div>

                    {/* MOCK EXPERIENCE SECTION */}
                    <div className="bg-[#13163a] border border-white/10 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            Experience
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-white/20" />
                            </div>
                            <p className="text-white/30 text-sm italic">Experience timeline not configured.</p>
                        </div>
                    </div>

                    {/* MOCK EDUCATION SECTION */}
                    <div className="bg-[#13163a] border border-white/10 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            Education
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                <Book className="w-5 h-5 text-white/20" />
                            </div>
                            <p className="text-white/30 text-sm italic">Education timeline not configured.</p>
                        </div>
                    </div>

                </div>

                {/* Right Column (Skills, Languages, Profile Strength) */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* ========== 6. PROFILE COMPLETION CARD ========== */}
                    <div className="bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 rounded-2xl p-6">
                        <h3 className="text-white font-bold text-sm mb-2">Profile Strength</h3>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-white/60">Completion</span>
                            <span className="text-primary font-mono font-bold text-lg">{score}%</span>
                        </div>
                        <div className="bg-white/10 rounded-full h-2 w-full mb-4">
                            <div 
                                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${score}%` }}
                            />
                        </div>
                        <ul className="space-y-1.5">
                            <li className={`text-xs flex items-center gap-2 ${checks.name ? 'text-emerald-400' : 'text-white/50'}`}>
                                {checks.name ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                Name added
                            </li>
                            <li className={`text-xs flex items-center gap-2 ${checks.bio ? 'text-emerald-400' : 'text-white/50'}`}>
                                {checks.bio ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                Bio added
                            </li>
                            <li className={`text-xs flex items-center gap-2 ${checks.skills ? 'text-emerald-400' : 'text-white/50'}`}>
                                {checks.skills ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                Skills added
                            </li>
                            <li className={`text-xs flex items-center gap-2 ${checks.languages ? 'text-emerald-400' : 'text-white/50'}`}>
                                {checks.languages ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                Languages added
                            </li>
                            <li className={`text-xs flex items-center gap-2 ${checks.location ? 'text-emerald-400' : 'text-white/50'}`}>
                                {checks.location ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                Location added
                            </li>
                        </ul>
                    </div>

                    {/* ========== 4. SKILLS SECTION ========== */}
                    <div className="bg-[#13163a] border border-white/10 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            Skills
                        </h2>
                        {isEditing ? (
                            <div className="space-y-3 mt-3">
                                <div className="flex gap-2">
                                    <Input
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                        placeholder="Add a skill"
                                        className="bg-[#0a0c27] border-white/10 text-white placeholder:text-white/40 h-8 text-sm"
                                    />
                                    <Button onClick={addSkill} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, idx) => (
                                        <span key={idx} className="bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold capitalize flex items-center gap-1.5">
                                            {skill}
                                            <button onClick={() => removeSkill(skill)} className="hover:bg-red-500/20 text-red-400 rounded-full p-0.5 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {profile.skills.length > 0 ? (
                                    <>
                                        {(showAllSkills ? profile.skills : profile.skills.slice(0, 10)).map((skill, idx) => {
                                            const formattedSkill = skill.toLowerCase() === 'api' ? 'API' : skill.toLowerCase() === 'ui' ? 'UI' : skill;
                                            return (
                                                <span key={idx} className="bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold capitalize">
                                                    {formattedSkill}
                                                </span>
                                            );
                                        })}
                                        {!showAllSkills && profile.skills.length > 10 && (
                                            <button onClick={() => setShowAllSkills(true)} className="bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:border-white/20 transition-colors rounded-full px-3 py-1 text-xs font-medium cursor-pointer">
                                                +{profile.skills.length - 10} more
                                            </button>
                                        )}
                                        {showAllSkills && profile.skills.length > 10 && (
                                            <button onClick={() => setShowAllSkills(false)} className="bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:border-white/20 transition-colors rounded-full px-3 py-1 text-xs font-medium cursor-pointer">
                                                Show less
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-white/30 text-sm italic">No skills added yet.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========== 5. LANGUAGES SECTION ========== */}
                    <div className="bg-[#13163a] border border-white/10 rounded-2xl p-6">
                        <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-full" />
                            Languages
                        </h2>
                        {isEditing ? (
                            <div className="space-y-3 mt-3">
                                <div className="flex flex-col gap-2">
                                    <Input
                                        value={newLanguage.name}
                                        onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                                        placeholder="Language name"
                                        className="bg-[#0a0c27] border-white/10 text-white placeholder:text-white/40 h-8 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={newLanguage.level}
                                            onChange={(e) => setNewLanguage({ ...newLanguage, level: e.target.value })}
                                            className="flex-1 px-3 py-1 h-8 bg-[#0a0c27] border border-white/10 rounded-md text-xs text-white"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            <option value="Native" className="bg-[#0D1225]">Native</option>
                                            <option value="Professional" className="bg-[#0D1225]">Professional</option>
                                            <option value="Conversational" className="bg-[#0D1225]">Conversational</option>
                                            <option value="Basic" className="bg-[#0D1225]">Basic</option>
                                        </select>
                                        <Button onClick={addLanguage} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {profile.languages.map((lang, idx) => (
                                        <span key={idx} className="bg-accent/10 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs font-semibold capitalize flex items-center gap-1.5">
                                            {lang.name} <span className="opacity-50 font-normal">({lang.level})</span>
                                            <button onClick={() => removeLanguage(idx)} className="hover:bg-red-500/20 text-red-400 rounded-full p-0.5 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {profile.languages.length > 0 ? (
                                    profile.languages.map((lang, idx) => (
                                        <span key={idx} className="bg-accent/10 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs font-semibold capitalize">
                                            {lang.name} <span className="opacity-50 font-normal">({lang.level})</span>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-white/30 text-sm italic">No languages added yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
