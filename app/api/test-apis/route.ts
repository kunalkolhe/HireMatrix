import { NextRequest, NextResponse } from 'next/server'

const APYHUB_API_KEY = process.env.APYHUB_API_KEY
const APILAYER_API_KEY = process.env.APILAYER_API_KEY

export async function GET(request: NextRequest) {
  try {
    console.log('Testing API connectivity...')
    
    const results = {
      apyhub: { status: 'unknown', error: null },
      apilayer: { status: 'unknown', error: null }
    }
    
    // Test APYHub
    if (APYHUB_API_KEY) {
      try {
        console.log('Testing APYHub connectivity...')
        const apyhubResponse = await fetch('https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume', {
          method: 'GET',
          headers: {
            'apy-token': APYHUB_API_KEY,
          },
        })
        results.apyhub.status = apyhubResponse.ok ? 'success' : `error_${apyhubResponse.status}`
        results.apyhub.error = apyhubResponse.ok ? null : `HTTP ${apyhubResponse.status}`
        console.log('APYHub test result:', results.apyhub)
      } catch (error) {
        results.apyhub.status = 'error'
        results.apyhub.error = error instanceof Error ? error.message : 'Unknown error'
        console.log('APYHub test error:', error)
      }
    } else {
      results.apyhub.status = 'no_key'
      results.apyhub.error = 'API key not configured'
    }
    
    // Test APILayer
    if (APILAYER_API_KEY) {
      try {
        console.log('Testing APILayer connectivity...')
        const apilayerResponse = await fetch('https://api.apilayer.com/resume_parser/url?url=https://example.com/test.pdf', {
          method: 'GET',
          headers: {
            'apikey': APILAYER_API_KEY,
          },
        })
        results.apilayer.status = apilayerResponse.ok ? 'success' : `error_${apilayerResponse.status}`
        results.apilayer.error = apilayerResponse.ok ? null : `HTTP ${apilayerResponse.status}`
        console.log('APILayer test result:', results.apilayer)
      } catch (error) {
        results.apilayer.status = 'error'
        results.apilayer.error = error instanceof Error ? error.message : 'Unknown error'
        console.log('APILayer test error:', error)
      }
    } else {
      results.apilayer.status = 'no_key'
      results.apilayer.error = 'API key not configured'
    }
    
    return NextResponse.json({
      message: 'API connectivity test completed',
      results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('API test error:', error)
    return NextResponse.json({ 
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
