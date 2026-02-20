import { NextRequest, NextResponse } from 'next/server'

// Judge0 API configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'your-rapidapi-key-here'

// Language mappings for Judge0
const LANGUAGE_IDS = {
  'javascript': 63,
  'python': 71,
  'java': 62,
  'cpp': 54,
  'c': 50,
  'csharp': 51,
  'go': 60,
  'rust': 73,
  'php': 68,
  'ruby': 72,
  'swift': 83,
  'kotlin': 78,
  'typescript': 74,
  'sql': 82,
  'r': 80,
  'scala': 81,
  'perl': 85,
  'haskell': 61,
  'lua': 64,
  'bash': 46,
  'powershell': 87,
  'mysql': 82,
  'postgresql': 82
}

export async function POST(request: NextRequest) {
  try {
    const { code, language, input, expectedOutput } = await request.json()

    if (!code || !language) {
      return NextResponse.json({ 
        error: 'Code and language are required' 
      }, { status: 400 })
    }

    const lowerLang = language.toLowerCase()

    // For JavaScript, route through the fallback executor so that `solution(input)`-style
    // snippets (as generated/shipped in this app) behave consistently and tests use the
    // same calling convention as the provided solutions.
    if (lowerLang === 'javascript') {
      try {
        const fallbackResponse = await fetch(new URL('/api/compile-fallback', request.nextUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language, input, expectedOutput })
        })

        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json().catch(() => ({}))
          return NextResponse.json({
            error: 'Fallback compilation failed',
            details: errorData
          }, { status: fallbackResponse.status })
        }

        const fallbackResult = await fallbackResponse.json()
        return NextResponse.json(fallbackResult)
      } catch (err) {
        console.error('Error delegating to compile-fallback:', err)
        return NextResponse.json({
          error: 'Internal error delegating to fallback compiler',
          details: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    const languageId = LANGUAGE_IDS[lowerLang as keyof typeof LANGUAGE_IDS]
    if (!languageId) {
      return NextResponse.json({ 
        error: `Unsupported language: ${language}` 
      }, { status: 400 })
    }

    console.log(`Compiling ${language} code...`)

    // Submit code for compilation
    const submissionResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: code,
        stdin: input || '',
        expected_output: expectedOutput || null
      })
    })

    if (!submissionResponse.ok) {
      const errorData = await submissionResponse.json()
      console.error('Judge0 submission error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to submit code for compilation',
        details: errorData
      }, { status: submissionResponse.status })
    }

    const submissionData = await submissionResponse.json()
    const token = submissionData.token

    console.log('Code submitted, token:', token)

    // Poll for results
    let attempts = 0
    const maxAttempts = 30
    let result = null

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      })

      if (!resultResponse.ok) {
        throw new Error(`Failed to get compilation result: ${resultResponse.status}`)
      }

      result = await resultResponse.json()
      console.log(`Attempt ${attempts + 1}: Status = ${result.status?.description}`)

      if (result.status?.id === 3) { // Accepted
        break
      } else if (result.status?.id >= 4) { // Compilation Error, Runtime Error, etc.
        break
      }

      attempts++
    }

    if (!result) {
      return NextResponse.json({ 
        error: 'Compilation timed out' 
      }, { status: 408 })
    }

    // Process the result
    const compilationResult: any = {
      success: result.status?.id === 3,
      status: result.status?.description || 'Unknown',
      output: result.stdout || '',
      error: result.stderr || result.compile_output || '',
      time: result.time || '0.000',
      memory: result.memory || '0',
      exitCode: result.exit_code || 0,
      language: language,
      token: token
    }

    // Check if expected output matches (if provided)
    if (expectedOutput && compilationResult.success) {
      const actualOutput = compilationResult.output.trim()
      const expected = expectedOutput.trim()
      compilationResult.testPassed = actualOutput === expected
    }

    console.log('Compilation result:', compilationResult)

    return NextResponse.json(compilationResult)

  } catch (error) {
    console.error('Compilation API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get supported languages
export async function GET() {
  try {
    const response = await fetch(`${JUDGE0_API_URL}/languages`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch languages: ${response.status}`)
    }

    const languages = await response.json()
    return NextResponse.json(languages)

  } catch (error) {
    console.error('Languages API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch supported languages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
