"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ResumeData {
  atsScore: number
  skills: string[]
  analysis: {
    strengths: string[]
    improvements: string[]
    overall: string
  }
  personalInfo: {
    name: string
    email: string
    phone: string
    address: string
    linkedin?: string
    website?: string
  }
  experience: Array<{
    company: string
    position: string
    duration: string
    description: string
  }>
  education: Array<{
    institution: string
    degree: string
    field: string
    year: string
  }>
  summary: string
  achievements: string[]
  certifications: string[]
  languages: string[]
  projects: string[]
  lastUpdated: string
}

interface ResumeContextType {
  resumeData: ResumeData | null
  setResumeData: (data: ResumeData | null) => void
  updateResumeScore: (score: number) => void
  updateSkills: (skills: string[]) => void
  clearResumeData: () => void
  loadUserData: (userId: string) => void
  clearUserData: () => void
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined)

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get user-specific localStorage key
  const getStorageKey = (userId: string) => `resumeAnalysis_${userId}`

  // Load data from localStorage when user changes
  useEffect(() => {
    // This will be called from dashboard when user is available
    // We don't load here to avoid race conditions
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (resumeData && currentUserId) {
      const storageKey = getStorageKey(currentUserId)
      localStorage.setItem(storageKey, JSON.stringify(resumeData))
    }
  }, [resumeData, currentUserId])

  const updateResumeScore = (score: number) => {
    setResumeData(prev => prev ? { ...prev, atsScore: score, lastUpdated: new Date().toISOString() } : null)
  }

  const updateSkills = (skills: string[]) => {
    setResumeData(prev => prev ? { ...prev, skills, lastUpdated: new Date().toISOString() } : null)
  }

  const clearResumeData = () => {
    setResumeData(null)
    if (currentUserId) {
      const storageKey = getStorageKey(currentUserId)
      localStorage.removeItem(storageKey)
    }
  }

  // Function to load user-specific data (called from dashboard)
  const loadUserData = (userId: string) => {
    if (userId !== currentUserId) {
      setCurrentUserId(userId)
      const storageKey = getStorageKey(userId)
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        try {
          setResumeData(JSON.parse(savedData))
        } catch (error) {
          console.error('Error loading resume data from localStorage:', error)
          setResumeData(null)
        }
      } else {
        setResumeData(null)
      }
    }
  }

  // Function to clear data when user logs out
  const clearUserData = () => {
    setResumeData(null)
    setCurrentUserId(null)
  }

  return (
    <ResumeContext.Provider value={{
      resumeData,
      setResumeData,
      updateResumeScore,
      updateSkills,
      clearResumeData,
      loadUserData,
      clearUserData
    }}>
      {children}
    </ResumeContext.Provider>
  )
}

export function useResume() {
  const context = useContext(ResumeContext)
  if (context === undefined) {
    throw new Error('useResume must be used within a ResumeProvider')
  }
  return context
}
