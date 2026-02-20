import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ParsedSkills } from '@/lib/types'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AssessAI'
  }
})

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

    const mcqResult = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Better quality than 3.5-turbo
      messages: [{ role: 'user', content: mcqPrompt }],
      temperature: 0.7, // Balance between creativity and consistency
      max_tokens: 2000
    })
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

    // Generate Subjective Questions
    const subjectivePrompt = `You are an expert technical interviewer creating high-quality scenario-based questions for a ${experienceLevel} level ${jobTitle} position.

CONTEXT:
- Job Title: ${jobTitle}
- Experience Level: ${experienceLevel}
- Skills Required: ${allSkills}
- Difficulty Level: ${config.difficulty}

REQUIREMENTS FOR HIGH-QUALITY SUBJECTIVE QUESTIONS:
1. **Real-World Scenarios**: Present actual situations candidates would face in this role
2. **Problem-Solving Focus**: Test how candidates approach and solve problems
3. **Clear Evaluation Criteria**: Provide specific rubric for what makes a good answer
4. **Appropriate Complexity**: Match the ${experienceLevel} level
5. **Skill Demonstration**: Allow candidates to showcase their knowledge of: ${allSkills}
6. **Actionable Answers**: Questions should elicit specific, actionable responses

QUESTION STRUCTURE:
- Scenario: Real-world situation relevant to ${jobTitle}
- Expected keywords: Key concepts, technologies, approaches to look for
- Rubric: Clear evaluation criteria (what makes an answer excellent vs. good vs. poor)
- Sample answer: Example of a strong answer (2-3 paragraphs)
- Word limit: Appropriate for the complexity (200-400 words)

EXAMPLE OF GOOD SUBJECTIVE QUESTION:
{
  "question": "You're building a new feature that needs to handle high traffic. Describe your approach to ensure the system can scale and remain performant. Include considerations for database queries, caching strategies, and potential bottlenecks.",
  "expected_keywords": ["scalability", "performance", "database optimization", "caching", "load balancing", "monitoring"],
  "rubric": "Excellent: Mentions specific techniques (query optimization, Redis caching, CDN, horizontal scaling), discusses trade-offs, includes monitoring. Good: Covers main concepts but less specific. Poor: Vague or missing key concepts.",
  "max_words": 350,
  "sample_answer": "I would start by analyzing the expected traffic patterns and identifying bottlenecks. For database queries, I'd implement indexing, query optimization, and consider read replicas for scaling reads. I'd use Redis for caching frequently accessed data and implement cache invalidation strategies. For the application layer, I'd ensure horizontal scalability with load balancing. I'd also set up monitoring and alerting to track performance metrics and identify issues early.",
  "skill_tags": ["System Design", "Performance", "Scalability"],
  "difficulty": "${config.difficulty}"
}

Generate ${config.subjective_count} high-quality subjective questions that:
- Present realistic scenarios for ${jobTitle} role
- Test problem-solving and practical knowledge
- Are appropriate for ${experienceLevel} level
- Cover skills: ${allSkills}
- Have clear evaluation rubrics

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "question": "Real-world scenario question",
    "expected_keywords": ["keyword1", "keyword2", "keyword3"],
    "rubric": "Clear evaluation criteria",
    "max_words": 300,
    "sample_answer": "Example of ideal answer (2-3 paragraphs)",
    "skill_tags": ["relevant", "skills"],
    "difficulty": "${config.difficulty}"
  }
]`

    const subjectiveResult = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Better quality than 3.5-turbo
      messages: [{ role: 'user', content: subjectivePrompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
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

    // Generate Coding Questions
    const codingPrompt = `You are an expert technical interviewer creating high-quality coding challenges for a ${experienceLevel} level ${jobTitle} position.

CONTEXT:
- Job Title: ${jobTitle}
- Experience Level: ${experienceLevel}
- Technical Skills: ${skills.technical.join(', ')}
- Tools/Frameworks: ${skills.tools.join(', ')}
- Difficulty Level: ${config.difficulty}

REQUIREMENTS FOR HIGH-QUALITY CODING PROBLEMS:
1. **Job Relevance**: Problems should reflect real tasks in ${jobTitle} role
2. **Appropriate Complexity**: 
   - Easy: Basic algorithms, simple data structures, straightforward logic
   - Medium: Multiple concepts, some optimization needed, moderate complexity
   - Hard: Advanced algorithms, optimization required, complex problem-solving
3. **Clear Problem Statement**: Unambiguous description of what needs to be solved
4. **Well-Defined I/O**: Clear input/output formats with examples
5. **Comprehensive Test Cases**: Include edge cases, boundary conditions, and hidden test cases
6. **Practical Application**: Problems should relate to real-world scenarios in ${jobTitle}
7. **Skill Testing**: Problems should test: ${skills.technical.join(', ')}

PROBLEM STRUCTURE:
- Problem statement: Clear, concise description of the task
- Input format: Exact format specification
- Output format: Exact format specification
- Constraints: Time/space limits, input size limits
- Examples: 2-3 examples with detailed explanations
- Test cases: 3-5 test cases (mix of visible and hidden)
- Starter code: Minimal boilerplate in multiple languages

EXAMPLE OF GOOD CODING PROBLEM:
{
  "problem_statement": "Given an array of integers representing daily stock prices, find the maximum profit you can achieve by buying and selling once. You must buy before you sell.",
  "input_format": "A single line containing comma-separated integers representing stock prices",
  "output_format": "A single integer representing the maximum profit (0 if no profit possible)",
  "constraints": [
    "1 <= prices.length <= 10^5",
    "0 <= prices[i] <= 10^4"
  ],
  "examples": [
    {
      "input": "7,1,5,3,6,4",
      "output": "5",
      "explanation": "Buy on day 2 (price=1) and sell on day 5 (price=6), profit = 6-1 = 5"
    },
    {
      "input": "7,6,4,3,1",
      "output": "0",
      "explanation": "No transaction is done, profit = 0"
    }
  ],
  "test_cases": [
    { "input": "7,1,5,3,6,4", "expected_output": "5", "is_hidden": false },
    { "input": "7,6,4,3,1", "expected_output": "0", "is_hidden": false },
    { "input": "1,2", "expected_output": "1", "is_hidden": true },
    { "input": "3,3,5,0,0,3,1,4", "expected_output": "4", "is_hidden": true }
  ],
  "starter_code": {
    "python": "def solution(prices_str):\\n    # Parse input: prices_str is comma-separated string\\n    # Return maximum profit as integer\\n    pass",
    "javascript": "function solution(pricesStr) {\\n    // Parse input: pricesStr is comma-separated string\\n    // Return maximum profit as number\\n}"
  },
  "skill_tags": ["Algorithms", "Arrays", "Problem Solving"],
  "difficulty": "${config.difficulty}",
  "time_limit_seconds": 30,
  "memory_limit_mb": 256
}

Generate ${config.coding_count} high-quality coding problems that:
- Are relevant to ${jobTitle} role and test: ${skills.technical.join(', ')}
- Match ${experienceLevel} level and ${config.difficulty} difficulty
- Have clear problem statements and well-defined test cases
- Include edge cases and boundary conditions
- Are practical and interview-appropriate

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "problem_statement": "Clear problem description",
    "input_format": "Exact input format",
    "output_format": "Exact output format",
    "constraints": ["Constraint 1", "Constraint 2"],
    "examples": [
      {
        "input": "example input",
        "output": "example output",
        "explanation": "Step-by-step explanation"
      }
    ],
    "test_cases": [
      { "input": "test1", "expected_output": "output1", "is_hidden": false },
      { "input": "test2", "expected_output": "output2", "is_hidden": true }
    ],
    "starter_code": {
      "python": "def solution(input):\\n    pass",
      "javascript": "function solution(input) {\\n}"
    },
    "skill_tags": ["relevant", "skills"],
    "difficulty": "${config.difficulty}",
    "time_limit_seconds": 30,
    "memory_limit_mb": 256
  }
]`

    const codingResult = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Better quality than 3.5-turbo
      messages: [{ role: 'user', content: codingPrompt }],
      temperature: 0.7,
      max_tokens: 2500
    })
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
    return NextResponse.json(
      { error: 'Failed to generate assessment questions. Please try again.' },
      { status: 500 }
    )
  }
}
