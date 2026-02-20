import { NextRequest, NextResponse } from 'next/server'

const APYHUB_API_KEY = process.env.APYHUB_API_KEY
const APILAYER_API_KEY = process.env.APILAYER_API_KEY

export async function GET() {
  try {
    console.log('Testing resume parsing APIs...')
    
    // Check API keys
    const apyhubConfigured = APYHUB_API_KEY && APYHUB_API_KEY.length >= 10
    const apilayerConfigured = APILAYER_API_KEY && APILAYER_API_KEY.length >= 10
    
    console.log('APYHub API Key configured:', apyhubConfigured)
    console.log('APILayer API Key configured:', apilayerConfigured)
    console.log('APYHub API Key length:', APYHUB_API_KEY?.length || 0)
    console.log('APILayer API Key length:', APILAYER_API_KEY?.length || 0)
    
    // Test APYHub API with a simple test
    let apyhubTest = null
    if (apyhubConfigured) {
      try {
        const testResponse = await fetch('https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume', {
          method: 'POST',
          headers: {
            'apy-token': APYHUB_API_KEY,
          },
        })
        
        apyhubTest = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok
        }
      } catch (error) {
        apyhubTest = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    // Test APILayer API with a simple test
    let apilayerTest = null
    if (apilayerConfigured) {
      try {
        const testResponse = await fetch('https://api.apilayer.com/resume_parser/upload', {
          method: 'POST',
          headers: {
            'apikey': APILAYER_API_KEY,
          },
        })
        
        apilayerTest = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok
        }
      } catch (error) {
        apilayerTest = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    return NextResponse.json({
      apyhub: {
        configured: apyhubConfigured,
        keyLength: APYHUB_API_KEY?.length || 0,
        test: apyhubTest
      },
      apilayer: {
        configured: apilayerConfigured,
        keyLength: APILAYER_API_KEY?.length || 0,
        test: apilayerTest
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasEnvFile: !!process.env.APYHUB_API_KEY
      }
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
