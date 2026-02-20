import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, language, input, expectedOutput } = await request.json()

    if (!code || !language) {
      return NextResponse.json({ 
        error: 'Code and language are required' 
      }, { status: 400 })
    }

    console.log(`Fallback compilation for ${language} code...`)

    // Simple JavaScript execution for demo purposes
    //
    // Convention: user / solution code should expose either:
    //   - a function named `solution(input)` that returns the final output, OR
    //   - a default export-style function when running in this sandbox.
    // We execute the snippet, then, if `solution` exists, call it with the provided input.
    if (language.toLowerCase() === 'javascript') {
      try {
        // Create an execution context that runs the user code and then invokes `solution` if present.
        const func = new Function(
          'input',
          `"use strict";\n` +
          `${code}\n` +
          `if (typeof solution === 'function') {\n` +
          `  return solution(input);\n` +
          `}\n` +
          `return undefined;`
        )

        const result = func(input ?? '')
        const output = typeof result === 'object' ? JSON.stringify(result) : String(result ?? '')

        return NextResponse.json({
          success: true,
          status: 'Accepted',
          output: output,
          error: '',
          time: '0.001',
          memory: '1024',
          exitCode: 0,
          language: language,
          testPassed: typeof expectedOutput === 'string' ? output.trim() === expectedOutput.trim() : undefined
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          status: 'Runtime Error',
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          time: '0.000',
          memory: '0',
          exitCode: 1,
          language: language
        })
      }
    }

    // For other languages, return a mock response
    return NextResponse.json({
      success: false,
      status: 'Not Supported',
      output: '',
      error: `Language ${language} is not supported in fallback mode. Please configure Judge0 API for full support.`,
      time: '0.000',
      memory: '0',
      exitCode: 1,
      language: language
    })

  } catch (error) {
    console.error('Fallback compilation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

