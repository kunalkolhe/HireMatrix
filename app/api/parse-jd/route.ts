import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AssessAI'
    }
})

export async function POST(request: Request) {
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
            model: 'openai/gpt-3.5-turbo',
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

        const parsedResult = JSON.parse(cleanedText)

        return NextResponse.json({
            success: true,
            data: parsedResult
        })
    } catch (error) {
        console.error('Error parsing JD:', error)
        return NextResponse.json(
            { error: 'Failed to parse job description. Please try again.' },
            { status: 500 }
        )
    }
}
