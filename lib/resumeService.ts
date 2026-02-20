import { supabase } from '@/lib/supabase'

export interface ResumeData {
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
}

export async function saveResumeData(userId: string, resumeData: ResumeData) {
  try {
    console.log('Attempting to save resume data for user:', userId)
    console.log('Resume data to save:', {
      atsScore: resumeData.atsScore,
      skillsCount: resumeData.skills.length,
      hasAnalysis: !!resumeData.analysis,
      hasPersonalInfo: !!resumeData.personalInfo
    })

    // First, try to find existing record
    const { data: existingData, error: fetchError } = await supabase
      .from('resume_data')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching existing resume data:', fetchError)
      throw fetchError
    }

    // Use insert or update based on whether record exists
    const { data, error } = await supabase
      .from('resume_data')
      .upsert({
        id: existingData?.id, // Use existing ID if updating
        user_id: userId,
        ats_score: resumeData.atsScore,
        skills: resumeData.skills,
        analysis: resumeData.analysis,
        personal_info: resumeData.personalInfo,
        experience: resumeData.experience,
        education: resumeData.education,
        summary: resumeData.summary,
        achievements: resumeData.achievements,
        certifications: resumeData.certifications,
        languages: resumeData.languages,
        projects: resumeData.projects,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // If table doesn't exist, provide helpful message
      if (error.code === 'PGRST116' || error.message.includes('relation "resume_data" does not exist')) {
        console.warn('resume_data table does not exist. Please run the SQL script in Supabase.')
        throw new Error('Database table not found. Please contact administrator.')
      }
      
      throw error
    }

    console.log('Resume data saved successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to save resume data:', error)
    throw error
  }
}

export async function getResumeData(userId: string) {
  try {
    const { data, error } = await supabase
      .from('resume_data')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching resume data:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch resume data:', error)
    throw error
  }
}

export async function updateResumeScore(userId: string, score: number) {
  try {
    const { data, error } = await supabase
      .from('resume_data')
      .upsert({
        user_id: userId,
        ats_score: score,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()

    if (error) {
      console.error('Error updating resume score:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to update resume score:', error)
    throw error
  }
}

export async function updateSkills(userId: string, skills: string[]) {
  try {
    const { data, error } = await supabase
      .from('resume_data')
      .upsert({
        user_id: userId,
        skills: skills,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()

    if (error) {
      console.error('Error updating skills:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to update skills:', error)
    throw error
  }
}
