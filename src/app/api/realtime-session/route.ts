import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { model = 'gpt-4o-realtime-preview', voice = 'alloy' } = await request.json()
    
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    // Create ephemeral token for client-side WebRTC/WebSocket connection
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to create session' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Realtime session API error:', error)
    
    const errorObj = error as any
    
    if (errorObj?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: errorObj?.message || 'An error occurred while creating session' },
      { status: 500 }
    )
  }
}