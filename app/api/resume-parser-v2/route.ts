import { NextRequest, NextResponse } from 'next/server'

const APYHUB_API_KEY = process.env.APYHUB_API_KEY
const APILAYER_API_KEY = process.env.APILAYER_API_KEY

export async function POST(request: NextRequest) {
  try {
    console.log('=== Resume Parser V2 - Starting ===')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('File received:', file.name, file.size, file.type)

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload PDF, DOC, DOCX, TXT, or RTF files only.' 
      }, { status: 400 })
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Please upload files smaller than 5MB.' 
      }, { status: 400 })
    }

    // Try APYHub first
    if (APYHUB_API_KEY && APYHUB_API_KEY.length >= 10) {
      console.log('Trying APYHub API...')
      try {
        const result = await parseWithAPYHub(file)
        if (result) {
          console.log('APYHub parsing successful')
          return NextResponse.json(result)
        }
      } catch (error) {
        console.log('APYHub failed:', error)
      }
    }

    // Try APILayer as fallback
    if (APILAYER_API_KEY && APILAYER_API_KEY.length >= 10) {
      console.log('Trying APILayer API...')
      try {
        const result = await parseWithAPILayer(file)
        if (result) {
          console.log('APILayer parsing successful')
          return NextResponse.json(result)
        }
      } catch (error) {
        console.log('APILayer failed:', error)
      }
    }

    // If both APIs fail, return error instead of fallback
    console.log('Both APIs failed')
    return NextResponse.json({ 
      error: 'Resume parsing failed',
      details: 'Both APYHub and APILayer APIs are unavailable. Please check your API keys and try again.'
    }, { status: 503 })

  } catch (error) {
    console.error('Resume parser error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function parseWithAPYHub(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('language', 'English')

  console.log('Submitting to APYHub...')
  
  // Submit for parsing
  const parseResponse = await fetch('https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume', {
    method: 'POST',
    headers: {
      'apy-token': APYHUB_API_KEY!,
    },
    body: formData,
  })

  if (!parseResponse.ok) {
    throw new Error(`APYHub API error: ${parseResponse.status}`)
  }

  const parseData = await parseResponse.json()
  console.log('APYHub parse response:', parseData)
  
  if (!parseData.job_id) {
    throw new Error('No job_id in APYHub response')
  }

  // Poll for results
  const jobId = parseData.job_id
  const maxAttempts = 30
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const statusResponse = await fetch(`https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume/job/status/${jobId}`, {
      method: 'GET',
      headers: {
        'apy-token': APYHUB_API_KEY!,
      },
    })

    if (!statusResponse.ok) {
      throw new Error(`APYHub status check error: ${statusResponse.status}`)
    }

    const statusData = await statusResponse.json()
    console.log(`APYHub status check ${attempts + 1}:`, statusData.status)
    
    if (statusData.status === 'completed') {
      const result = statusData.result
      console.log('APYHub parsing completed, processing result...')
      return processResumeData(result, 'APYHub')
    } else if (statusData.status === 'failed') {
      throw new Error('APYHub parsing failed')
    }
    
    attempts++
  }

  throw new Error('APYHub parsing timed out')
}

async function parseWithAPILayer(file: File) {
  const buffer = await file.arrayBuffer()
  
  console.log('Submitting to APILayer...')
  
  const response = await fetch('https://api.apilayer.com/resume_parser/upload', {
    method: 'POST',
    headers: {
      'apikey': APILAYER_API_KEY!,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  })

  if (!response.ok) {
    throw new Error(`APILayer API error: ${response.status}`)
  }

  const result = await response.json()
  console.log('APILayer parsing completed, processing result...')
  return processResumeData(result, 'APILayer')
}

function processResumeData(data: any, source: string) {
  console.log(`Processing resume data from ${source}:`, JSON.stringify(data, null, 2))
  
  // Extract all possible data fields
  const extractedData = {
    atsScore: calculateATSScore(data),
    analysis: {
      strengths: extractStrengths(data),
      improvements: extractImprovements(data),
      overall: generateOverallAnalysis(data)
    },
    skills: extractSkills(data),
    personalInfo: extractPersonalInfo(data),
    experience: extractExperience(data),
    education: extractEducation(data),
    summary: extractSummary(data),
    achievements: extractAchievements(data),
    certifications: extractCertifications(data),
    languages: extractLanguages(data),
    projects: extractProjects(data),
    rawData: data,
    source: source
  }
  
  console.log('Final extracted data:', JSON.stringify(extractedData, null, 2))
  return extractedData
}

function calculateATSScore(data: any): number {
  let score = 0
  
  // Contact Information (25 points)
  if (data.contact_info?.email || data.email) score += 8
  if (data.contact_info?.phone || data.phone) score += 8
  if (data.contact_info?.address || data.address) score += 4
  if (data.contact_info?.linkedin || data.linkedin) score += 3
  if (data.contact_info?.website || data.website) score += 2
  
  // Professional Summary (15 points)
  if (data.summary || data.objective || data.professional_summary) score += 15
  
  // Work Experience (30 points)
  if (data.experience && data.experience.length > 0) {
    score += Math.min(data.experience.length * 5, 20)
    const hasDetailedExp = data.experience.some((exp: any) => 
      exp.description && exp.description.length > 50
    )
    if (hasDetailedExp) score += 10
  }
  
  // Education (15 points)
  if (data.education && data.education.length > 0) {
    score += Math.min(data.education.length * 5, 10)
    const hasDegreeDetails = data.education.some((edu: any) => 
      edu.degree && edu.institution
    )
    if (hasDegreeDetails) score += 5
  }
  
  // Skills (20 points)
  if (data.skills && data.skills.length > 0) {
    score += Math.min(data.skills.length * 2, 15)
    const technicalSkills = data.skills.filter((skill: any) => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('programming') ||
        skill.toLowerCase().includes('software') ||
        skill.toLowerCase().includes('language') ||
        skill.toLowerCase().includes('framework') ||
        skill.toLowerCase().includes('tool')
      )
    )
    if (technicalSkills.length > 0) score += 5
  }
  
  // Achievements and Certifications (10 points)
  if (data.achievements && data.achievements.length > 0) score += 5
  if (data.certifications && data.certifications.length > 0) score += 5
  
  // Keywords and ATS optimization (10 points)
  const resumeText = JSON.stringify(data).toLowerCase()
  const atsKeywords = [
    'achievement', 'accomplished', 'improved', 'increased', 'reduced',
    'managed', 'led', 'developed', 'implemented', 'optimized'
  ]
  
  const keywordCount = atsKeywords.filter(keyword => 
    resumeText.includes(keyword)
  ).length
  
  score += Math.min(keywordCount * 2, 10)
  
  return Math.min(score, 100)
}

function extractSkills(data: any): string[] {
  const skills: string[] = []
  
  // Extract from skills array
  if (data.skills && Array.isArray(data.skills)) {
    data.skills.forEach((skill: any) => {
      if (typeof skill === 'string') {
        skills.push(skill.trim())
      } else if (skill.name) {
        skills.push(skill.name.trim())
      } else if (skill.skill) {
        skills.push(skill.skill.trim())
      } else if (skill.title) {
        skills.push(skill.title.trim())
      } else {
        skills.push(String(skill).trim())
      }
    })
  }
  
  // Extract from technical_skills
  if (data.technical_skills && Array.isArray(data.technical_skills)) {
    data.technical_skills.forEach((skill: any) => {
      if (typeof skill === 'string') {
        skills.push(skill.trim())
      } else if (skill.name) {
        skills.push(skill.name.trim())
      } else {
        skills.push(String(skill).trim())
      }
    })
  }
  
  // Extract from competencies
  if (data.competencies && Array.isArray(data.competencies)) {
    data.competencies.forEach((skill: any) => {
      if (typeof skill === 'string') {
        skills.push(skill.trim())
      } else if (skill.name) {
        skills.push(skill.name.trim())
      } else {
        skills.push(String(skill).trim())
      }
    })
  }
  
  // Extract from experience descriptions
  if (data.experience && Array.isArray(data.experience)) {
    data.experience.forEach((exp: any) => {
      const expText = (exp.description || exp.responsibilities || exp.duties || '').toLowerCase()
      
      const techKeywords = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin',
        'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
        'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'Tailwind', 'jQuery',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
        'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git',
        'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'Adobe XD',
        'Excel', 'PowerBI', 'Tableau', 'Salesforce', 'HubSpot'
      ]
      
      techKeywords.forEach(keyword => {
        if (expText.includes(keyword.toLowerCase()) && !skills.some(s => s.toLowerCase() === keyword.toLowerCase())) {
          skills.push(keyword)
        }
      })
    })
  }
  
  // Extract from summary
  const summaryText = (data.summary || data.objective || data.professional_summary || '').toLowerCase()
  if (summaryText) {
    const summaryKeywords = [
      'Leadership', 'Management', 'Communication', 'Problem Solving', 'Teamwork',
      'Project Management', 'Agile', 'Scrum', 'Analytics', 'Data Analysis',
      'Marketing', 'Sales', 'Customer Service', 'Finance', 'Accounting'
    ]
    
    summaryKeywords.forEach(keyword => {
      if (summaryText.includes(keyword.toLowerCase()) && !skills.some(s => s.toLowerCase() === keyword.toLowerCase())) {
        skills.push(keyword)
      }
    })
  }
  
  return [...new Set(skills)].slice(0, 25)
}

function extractPersonalInfo(data: any): any {
  const name = data.contact_info?.name || 
               data.name || 
               data.personal_info?.name || 
               data.basic_info?.name ||
               data.candidate?.name ||
               data.full_name ||
               'Not provided'
  
  const email = data.contact_info?.email || 
                data.email || 
                data.personal_info?.email || 
                data.basic_info?.email ||
                data.candidate?.email ||
                data.contact?.email ||
                'Not provided'
  
  const phone = data.contact_info?.phone || 
                data.phone || 
                data.personal_info?.phone || 
                data.basic_info?.phone ||
                data.candidate?.phone ||
                data.contact?.phone ||
                data.mobile ||
                'Not provided'
  
  const address = data.contact_info?.address || 
                  data.address || 
                  data.personal_info?.address || 
                  data.basic_info?.address ||
                  data.candidate?.address ||
                  data.contact?.address ||
                  data.location ||
                  'Not provided'
  
  const linkedin = data.contact_info?.linkedin || 
                   data.linkedin || 
                   data.personal_info?.linkedin || 
                   data.basic_info?.linkedin ||
                   data.candidate?.linkedin ||
                   data.contact?.linkedin ||
                   null
  
  const website = data.contact_info?.website || 
                  data.website || 
                  data.personal_info?.website || 
                  data.basic_info?.website ||
                  data.candidate?.website ||
                  data.contact?.website ||
                  null
  
  return {
    name: name.toString().trim(),
    email: email.toString().trim(),
    phone: phone.toString().trim(),
    address: address.toString().trim(),
    linkedin: linkedin ? linkedin.toString().trim() : null,
    website: website ? website.toString().trim() : null
  }
}

function extractExperience(data: any): any[] {
  const experienceData = data.experience || 
                        data.work_experience || 
                        data.employment_history || 
                        data.work_history ||
                        data.jobs ||
                        data.positions ||
                        []
  
  if (!Array.isArray(experienceData)) {
    return []
  }
  
  return experienceData.map((exp: any) => ({
    company: (exp.company || exp.organization || exp.employer || exp.company_name || 'Unknown Company').toString().trim(),
    position: (exp.position || exp.title || exp.job_title || exp.role || 'Unknown Position').toString().trim(),
    duration: (exp.duration || exp.dates || exp.period || exp.time_period || 'Duration not specified').toString().trim(),
    description: (exp.description || exp.responsibilities || exp.duties || exp.summary || 'No description provided').toString().trim()
  }))
}

function extractEducation(data: any): any[] {
  const educationData = data.education || 
                       data.educational_background || 
                       data.academic_background || 
                       data.qualifications ||
                       data.academic_history ||
                       data.schools ||
                       []
  
  if (!Array.isArray(educationData)) {
    return []
  }
  
  return educationData.map((edu: any) => ({
    institution: (edu.institution || edu.school || edu.name || edu.university || edu.college || 'Unknown Institution').toString().trim(),
    degree: (edu.degree || edu.qualification || edu.certificate || edu.diploma || edu.program || 'Unknown Degree').toString().trim(),
    field: (edu.field || edu.major || edu.specialization || edu.subject || edu.discipline || 'Field not specified').toString().trim(),
    year: (edu.year || edu.graduation_year || edu.date || edu.end_date || edu.completion_date || 'Year not specified').toString().trim()
  }))
}

function extractSummary(data: any): string {
  return (data.summary || data.objective || data.professional_summary || data.profile || '').toString().trim()
}

function extractAchievements(data: any): string[] {
  const achievements = data.achievements || data.awards || data.honors || []
  return Array.isArray(achievements) ? achievements.map((a: any) => a.toString().trim()) : []
}

function extractCertifications(data: any): string[] {
  const certifications = data.certifications || data.certificates || data.licenses || []
  return Array.isArray(certifications) ? certifications.map((c: any) => c.toString().trim()) : []
}

function extractLanguages(data: any): string[] {
  const languages = data.languages || data.language_skills || []
  return Array.isArray(languages) ? languages.map((l: any) => l.toString().trim()) : []
}

function extractProjects(data: any): string[] {
  const projects = data.projects || data.portfolio || []
  return Array.isArray(projects) ? projects.map((p: any) => p.toString().trim()) : []
}

function extractStrengths(data: any): string[] {
  const strengths = []
  
  // Extract from skills
  if (data.skills && data.skills.length > 0) {
    strengths.push(`Strong technical skills in ${data.skills.slice(0, 3).join(', ')}`)
  }
  
  // Extract from experience
  if (data.experience && data.experience.length > 0) {
    strengths.push(`Relevant work experience with ${data.experience.length} position(s)`)
  }
  
  // Extract from education
  if (data.education && data.education.length > 0) {
    strengths.push(`Solid educational background`)
  }
  
  // Extract from achievements
  if (data.achievements && data.achievements.length > 0) {
    strengths.push(`Notable achievements and accomplishments`)
  }
  
  return strengths.length > 0 ? strengths : ['Resume shows good structure and organization']
}

function extractImprovements(data: any): string[] {
  const improvements = []
  
  // Check for missing contact info
  if (!data.contact_info?.email && !data.email) {
    improvements.push('Add professional email address')
  }
  
  if (!data.contact_info?.phone && !data.phone) {
    improvements.push('Include phone number')
  }
  
  // Check for missing summary
  if (!data.summary && !data.objective && !data.professional_summary) {
    improvements.push('Add a professional summary or objective')
  }
  
  // Check for skills
  if (!data.skills || data.skills.length === 0) {
    improvements.push('Include relevant skills section')
  }
  
  // Check for experience descriptions
  if (data.experience && data.experience.length > 0) {
    const hasDescriptions = data.experience.some((exp: any) => 
      exp.description && exp.description.length > 20
    )
    if (!hasDescriptions) {
      improvements.push('Add detailed descriptions to work experience')
    }
  }
  
  return improvements.length > 0 ? improvements : ['Resume is well-structured']
}

function generateOverallAnalysis(data: any): string {
  const score = calculateATSScore(data)
  const skillsCount = data.skills ? data.skills.length : 0
  const expCount = data.experience ? data.experience.length : 0
  
  let analysis = `This resume has an ATS score of ${score}/100. `
  
  if (score >= 80) {
    analysis += 'The resume is well-optimized for ATS systems with strong technical skills, relevant experience, and good structure.'
  } else if (score >= 60) {
    analysis += 'The resume shows good potential but could benefit from more detailed descriptions and additional skills.'
  } else {
    analysis += 'The resume needs significant improvements in structure, content, and ATS optimization.'
  }
  
  if (skillsCount > 0) {
    analysis += ` It includes ${skillsCount} relevant skills.`
  }
  
  if (expCount > 0) {
    analysis += ` The candidate has ${expCount} work experience entries.`
  }
  
  return analysis
}
