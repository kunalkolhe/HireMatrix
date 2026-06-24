import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        maxRetries: 0,
        timeout: 5000,
        defaultHeaders: {
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'HireMatrix'
        }
    })

    try {
        const { jobDescription } = await request.json()

        if (!jobDescription || jobDescription.trim().length < 50) {
            return NextResponse.json(
                { error: 'Job description must be at least 50 characters' },
                { status: 400 }
            )
        }

        const prompt = `You are an expert HR and technical recruiter. Analyze the following job description and extract structured information.

Job Description:
${jobDescription}

Return a JSON object with EXACTLY this structure (no markdown, just pure JSON):
{
  "title": "Job title extracted or inferred",
  "experience_level": "One of: fresher, junior, mid, senior",
  "skills": {
    "technical": ["Array of technical skills required"],
    "soft": ["Array of soft skills mentioned or implied"],
    "tools": ["Array of specific tools, frameworks, languages mentioned"],
    "domain_knowledge": ["Array of domain-specific knowledge areas"]
  },
  "responsibilities": ["Array of key job responsibilities"],
  "qualifications": ["Array of required/preferred qualifications"],
  "assessment_recommendations": {
    "mcq_topics": ["Topics suitable for MCQ questions"],
    "subjective_topics": ["Topics for subjective/scenario questions"],
    "coding_topics": ["Topics for coding challenges"],
    "difficulty": "One of: easy, medium, hard",
    "suggested_duration_minutes": 60
  }
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting
- Be thorough in extracting skills
- Infer soft skills if not explicitly mentioned
- For assessment recommendations, focus on verifiable skills`

        const completion = await openai.chat.completions.create({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }]
        })

        const text = completion.choices[0]?.message?.content || ''

        // Clean up the response - remove markdown code blocks if present
        let cleanedText = text.trim()
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.slice(7)
        }
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.slice(3)
        }
        if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.slice(0, -3)
        }
        cleanedText = cleanedText.trim()

        let parsedResult
        try {
            parsedResult = JSON.parse(cleanedText)
        } catch (e) {
            console.error('Failed to parse JSON response:', cleanedText)
            throw new Error('Failed to parse the AI response. Please try again.')
        }

        return NextResponse.json({
            success: true,
            data: parsedResult
        })
    } catch (error) {
        console.error('Error parsing JD:', error)
        
        // Fallback mock data if API key is invalid or request fails
        const mockParsedResult = {
            title: "Software Engineer",
            experience_level: "mid",
            skills: {
                technical: ["JavaScript", "React", "Node.js", "TypeScript", "SQL"],
                soft: ["Communication", "Problem Solving", "Teamwork", "Time Management"],
                tools: ["Git", "VS Code", "Jira", "Docker"],
                domain_knowledge: ["Web Development", "REST APIs", "Frontend Architecture"]
            },
            responsibilities: [
                "Develop and maintain high-quality web applications",
                "Collaborate with cross-functional teams to define and design new features",
                "Write clean, scalable, and efficient code",
                "Troubleshoot and debug production issues"
            ],
            qualifications: [
                "Bachelor's degree in Computer Science or related field",
                "3+ years of experience in full-stack web development",
                "Strong understanding of modern JavaScript frameworks"
            ],
            assessment_recommendations: {
                mcq_topics: ["React Hooks", "JavaScript Closures", "REST API Design", "SQL Joins"],
                subjective_topics: ["System Design", "State Management", "Performance Optimization"],
                coding_topics: ["Data Structures", "Algorithms", "React Component creation"],
                difficulty: "medium",
                suggested_duration_minutes: 60
            }
        }

        console.log('Returning mock data due to API failure')
        return NextResponse.json({
            success: true,
            data: mockParsedResult,
            isMock: true
        })
    }
}
