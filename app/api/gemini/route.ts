import { QuotaManager } from '@/lib/quota-manager'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { prompt, audio } = await request.json()

    // Initialize API keys if not already done
    QuotaManager.initializeApiKeys()

    // Get API key
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return Response.json({
        error: 'No OpenRouter API key available'
      }, { status: 500 })
    }

    // Check if we should wait for rate limiting
    if (QuotaManager.shouldWaitForRateLimit()) {
      return Response.json({
        error: 'Rate limit: Please wait a moment before making another request',
        retryAfter: 2
      }, { status: 429 })
    }

    // Record API call for rate limiting
    QuotaManager.recordApiCall()

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AssessAI'
      }
    })

    let responseText: string

    if (audio) {
      // For audio, we need to use Whisper - OpenRouter doesn't support audio directly
      // So we'll use a text-based approach or return an error
      return Response.json({
        error: 'Audio transcription not supported with OpenRouter. Please use text input.'
      }, { status: 400 })
    }

    // Use a free/cheap model available on OpenRouter
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    })

    responseText = completion.choices[0]?.message?.content || ''

    return Response.json({
      response: responseText,
      quotaInfo: {
        remaining: 1000,
        total: 1000,
        apiKeyIndex: 0
      }
    })
  } catch (error) {
    console.error('OpenRouter API error:', error)

    let errorMessage = 'Failed to generate content'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'API rate limit exceeded. Please wait a few minutes before trying again.'
        statusCode = 429
      } else if (error.message.includes('401') || error.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your OpenRouter API key.'
        statusCode = 401
      }
    }

    return Response.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: statusCode })
  }
}
