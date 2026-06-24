import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ParsedSkills } from '@/lib/types'

interface GenerateRequest {
  jobTitle: string
  skills: ParsedSkills
  experienceLevel: string
  config: {
    mcq_count: number
    subjective_count: number
    coding_count: number
    difficulty: string
  }
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  return cleaned.trim()
}

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
    const body: GenerateRequest = await request.json()
    const { jobTitle, skills, experienceLevel, config } = body

    const allSkills = [
      ...skills.technical,
      ...skills.tools,
      ...skills.domain_knowledge
    ].join(', ')

    // Generate MCQs
    const mcqPrompt = `You are an expert technical interviewer creating high-quality assessment questions for a ${experienceLevel} level ${jobTitle} position.

CONTEXT:
- Job Title: ${jobTitle}
- Experience Level: ${experienceLevel}
- Skills Required: ${allSkills}
- Difficulty Level: ${config.difficulty}

REQUIREMENTS FOR HIGH-QUALITY MCQs:
1. **Job Relevance**: Questions must directly test skills needed for this specific role
2. **Practical Application**: Focus on real-world scenarios, not just theoretical knowledge
3. **Clear and Unambiguous**: Each question should have ONE clearly correct answer
4. **Appropriate Difficulty**: 
   - Easy: Basic concepts, syntax, common patterns
   - Medium: Problem-solving, best practices, common pitfalls
   - Hard: Advanced concepts, optimization, edge cases
5. **Distractor Quality**: Wrong options should be plausible but clearly incorrect
6. **No Trick Questions**: Test knowledge, not reading comprehension tricks
7. **Skill Coverage**: Distribute questions across the required skills: ${allSkills}

QUESTION STRUCTURE:
- Question text: Clear, concise, specific to the role
- 4 options: One correct, three plausible distractors
- Explanation: Brief but educational explanation
- Skill tags: Relevant skills from: ${allSkills}

EXAMPLE OF GOOD MCQ:
{
  "question": "In a React application, which hook should you use to perform side effects after component render?",
  "options": [
    "useState",
    "useEffect",
    "useContext",
    "useReducer"
  ],
  "correct_answer": 1,
  "explanation": "useEffect is specifically designed for side effects like API calls, subscriptions, or DOM manipulation that should run after render.",
  "skill_tags": ["React", "JavaScript"],
  "difficulty": "medium"
}

Generate ${config.mcq_count} high-quality MCQs that:
- Test practical knowledge needed for ${jobTitle}
- Are appropriate for ${experienceLevel} level candidates
- Cover different aspects of: ${allSkills}
- Have clear, unambiguous correct answers
- Include helpful explanations

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "question": "Clear, job-relevant question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Educational explanation of why this answer is correct",
    "skill_tags": ["relevant", "skill", "tags"],
    "difficulty": "${config.difficulty}"
  }
]`

    // Run all 3 generation tasks in parallel to dramatically speed up generation time
    const [mcqResult, subjectiveResult, codingResult] = await Promise.all([
      config.mcq_count > 0 ? openai.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: mcqPrompt }],
        temperature: 0.7,
        max_tokens: 2000
      }) : Promise.resolve({ choices: [{ message: { content: '[]' } }] }),
      
      config.subjective_count > 0 ? openai.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: subjectivePrompt }],
        temperature: 0.7,
        max_tokens: 2000
      }) : Promise.resolve({ choices: [{ message: { content: '[]' } }] }),
      
      config.coding_count > 0 ? openai.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: codingPrompt }],
        temperature: 0.7,
        max_tokens: 2500
      }) : Promise.resolve({ choices: [{ message: { content: '[]' } }] })
    ])

    const mcqText = cleanJsonResponse(mcqResult.choices[0]?.message?.content || '[]')
    let mcqQuestions = []
    try {
      mcqQuestions = JSON.parse(mcqText)
      // Validate and filter questions
      mcqQuestions = mcqQuestions.filter((q: any) => 
        q.question && 
        q.options && 
        Array.isArray(q.options) && 
        q.options.length >= 4 &&
        typeof q.correct_answer === 'number' &&
        q.correct_answer >= 0 &&
        q.correct_answer < q.options.length
      )
      // Ensure we have the requested count
      if (mcqQuestions.length < config.mcq_count) {
        console.warn(`Only generated ${mcqQuestions.length} valid MCQs, requested ${config.mcq_count}`)
      }
      mcqQuestions = mcqQuestions.slice(0, config.mcq_count)
    } catch (error) {
      console.error('Error parsing MCQ questions:', error)
      mcqQuestions = []
    }

    const subjectiveText = cleanJsonResponse(subjectiveResult.choices[0]?.message?.content || '[]')
    let subjectiveQuestions = []
    try {
      subjectiveQuestions = JSON.parse(subjectiveText)
      // Validate and filter questions
      subjectiveQuestions = subjectiveQuestions.filter((q: any) => 
        q.question && 
        q.expected_keywords && 
        Array.isArray(q.expected_keywords) &&
        q.rubric
      )
      // Ensure we have the requested count
      if (subjectiveQuestions.length < config.subjective_count) {
        console.warn(`Only generated ${subjectiveQuestions.length} valid subjective questions, requested ${config.subjective_count}`)
      }
      subjectiveQuestions = subjectiveQuestions.slice(0, config.subjective_count)
    } catch (error) {
      console.error('Error parsing subjective questions:', error)
      subjectiveQuestions = []
    }

    const codingText = cleanJsonResponse(codingResult.choices[0]?.message?.content || '[]')
    let codingQuestions = []
    try {
      codingQuestions = JSON.parse(codingText)
      // Validate and filter questions
      codingQuestions = codingQuestions.filter((q: any) => 
        q.problem_statement && 
        q.input_format && 
        q.output_format &&
        q.examples &&
        Array.isArray(q.examples) &&
        q.test_cases &&
        Array.isArray(q.test_cases) &&
        q.test_cases.length >= 2
      )
      // Ensure we have the requested count
      if (codingQuestions.length < config.coding_count) {
        console.warn(`Only generated ${codingQuestions.length} valid coding questions, requested ${config.coding_count}`)
      }
      codingQuestions = codingQuestions.slice(0, config.coding_count)
    } catch (error) {
      console.error('Error parsing coding questions:', error)
      codingQuestions = []
    }

    // Validate we have questions before formatting
    if (mcqQuestions.length === 0 && config.mcq_count > 0) {
      console.error('No valid MCQ questions generated')
    }
    if (subjectiveQuestions.length === 0 && config.subjective_count > 0) {
      console.error('No valid subjective questions generated')
    }
    if (codingQuestions.length === 0 && config.coding_count > 0) {
      console.error('No valid coding questions generated')
    }

    // Format all questions with proper structure
    const formattedQuestions = [
      ...mcqQuestions.map((q: any, i: number) => ({
        id: `mcq-${i + 1}`,
        type: 'mcq',
        difficulty: q.difficulty || config.difficulty,
        skill_tags: Array.isArray(q.skill_tags) ? q.skill_tags : [],
        marks: 5,
        content: {
          question: q.question || `MCQ Question ${i + 1}`,
          options: Array.isArray(q.options) && q.options.length >= 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: typeof q.correct_answer === 'number' && q.correct_answer >= 0 && q.correct_answer < (q.options?.length || 4) ? q.correct_answer : 0,
          explanation: q.explanation || 'No explanation provided'
        },
        order: i + 1
      })),
      ...subjectiveQuestions.map((q: any, i: number) => ({
        id: `subjective-${i + 1}`,
        type: 'subjective',
        difficulty: q.difficulty || config.difficulty,
        skill_tags: Array.isArray(q.skill_tags) ? q.skill_tags : [],
        marks: 15,
        content: {
          question: q.question || `Subjective Question ${i + 1}`,
          expected_keywords: Array.isArray(q.expected_keywords) ? q.expected_keywords : [],
          rubric: q.rubric || 'Evaluate based on completeness and accuracy',
          max_words: q.max_words || 300,
          sample_answer: q.sample_answer || 'Sample answer not provided'
        },
        order: mcqQuestions.length + i + 1
      })),
      ...codingQuestions.map((q: any, i: number) => ({
        id: `coding-${i + 1}`,
        type: 'coding',
        difficulty: q.difficulty || config.difficulty,
        skill_tags: Array.isArray(q.skill_tags) ? q.skill_tags : [],
        marks: 25,
        content: {
          problem_statement: q.problem_statement || `Coding Problem ${i + 1}`,
          input_format: q.input_format || 'Input format not specified',
          output_format: q.output_format || 'Output format not specified',
          constraints: Array.isArray(q.constraints) ? q.constraints : [],
          examples: Array.isArray(q.examples) ? q.examples : [],
          test_cases: Array.isArray(q.test_cases) && q.test_cases.length >= 2 ? q.test_cases : [
            { input: "test1", expected_output: "output1", is_hidden: false },
            { input: "test2", expected_output: "output2", is_hidden: true }
          ],
          starter_code: q.starter_code || {
            python: "def solution(input):\n    pass",
            javascript: "function solution(input) {\n}"
          },
          time_limit_seconds: q.time_limit_seconds || 30,
          memory_limit_mb: q.memory_limit_mb || 256
        },
        order: mcqQuestions.length + subjectiveQuestions.length + i + 1
      }))
    ]

    // Final validation - ensure we have at least some questions
    if (formattedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any valid questions. Please try again or check your job description.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        questions: formattedQuestions,
        summary: {
          total: formattedQuestions.length,
          mcq_count: mcqQuestions.length,
          subjective_count: subjectiveQuestions.length,
          coding_count: codingQuestions.length,
          total_marks: formattedQuestions.reduce((sum: number, q: any) => sum + q.marks, 0)
        }
      }
    })
  } catch (error) {
    console.error('Error generating assessment:', error)
    
    // Fallback mock data if API key is invalid or request fails
    const mockQuestions = [
      {
        id: "mcq-1",
        type: "mcq",
        difficulty: "medium",
        skill_tags: ["React", "JavaScript"],
        marks: 5,
        content: {
          question: "In a React application, which hook should you use to perform side effects after component render?",
          options: ["useState", "useEffect", "useContext", "useReducer"],
          correct_answer: 1,
          explanation: "useEffect is specifically designed for side effects like API calls, subscriptions, or DOM manipulation that should run after render."
        },
        order: 1
      },
      {
        id: "subjective-1",
        type: "subjective",
        difficulty: "medium",
        skill_tags: ["System Design", "Scalability"],
        marks: 15,
        content: {
          question: "You're building a new feature that needs to handle high traffic. Describe your approach to ensure the system can scale and remain performant.",
          expected_keywords: ["scalability", "caching", "database optimization"],
          rubric: "Excellent: Mentions specific techniques like caching and load balancing.",
          max_words: 350,
          sample_answer: "I would start by analyzing expected traffic patterns. I'd use Redis for caching and ensure horizontal scalability with load balancing."
        },
        order: 2
      },
      {
        id: "coding-1",
        type: "coding",
        difficulty: "medium",
        skill_tags: ["Algorithms", "Problem Solving"],
        marks: 25,
        content: {
          problem_statement: "Given an array of integers representing daily stock prices, find the maximum profit you can achieve by buying and selling once.",
          input_format: "Comma-separated integers",
          output_format: "A single integer",
          constraints: ["1 <= prices.length <= 10^5"],
          examples: [
            { input: "7,1,5,3,6,4", output: "5", explanation: "Buy on day 2 and sell on day 5" }
          ],
          test_cases: [
            { input: "7,1,5,3,6,4", expected_output: "5", is_hidden: false },
            { input: "7,6,4,3,1", expected_output: "0", is_hidden: true }
          ],
          starter_code: {
            python: "def solution(prices_str):\n    pass",
            javascript: "function solution(pricesStr) {\n}"
          },
          time_limit_seconds: 30,
          memory_limit_mb: 256
        },
        order: 3
      }
    ]

    console.log('Returning mock assessment due to API failure')
    return NextResponse.json({
      success: true,
      data: {
        questions: mockQuestions,
        summary: {
          total: mockQuestions.length,
          mcq_count: 1,
          subjective_count: 1,
          coding_count: 1,
          total_marks: 45
        },
        isMock: true
      }
    })
  }
}
