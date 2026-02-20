import { NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const params = new URLSearchParams()
    params.set('text', text)
    params.set('language', typeof language === 'string' && language ? language : 'en-US')

    const ltResponse = await fetch('https://api.dev.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    if (!ltResponse.ok) {
      const details = await ltResponse.text().catch(() => '')
      return NextResponse.json({ error: 'LanguageTool request failed', details }, { status: ltResponse.status })
    }

    const data = await ltResponse.json()
    return NextResponse.json({ matches: data.matches || [], language: data.language || null })
  } catch (error: any) {
    return NextResponse.json({ error: 'Unexpected error', details: error?.message || String(error) }, { status: 500 })
  }
}


