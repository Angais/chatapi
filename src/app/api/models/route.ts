import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const models = await openai.models.list()
    
    // Filter to show only chat completion models and sort them
    const chatModels = models.data
      .filter(model => 
        model.id.includes('gpt') || 
        model.id.includes('o1') ||
        model.id.includes('chatgpt')
      )
      .sort((a, b) => {
        // Prioritize GPT-4 models, then GPT-3.5, then others
        const priority = (id: string) => {
          if (id.includes('gpt-4o')) return 1
          if (id.includes('gpt-4')) return 2
          if (id.includes('o1')) return 3
          if (id.includes('gpt-3.5')) return 4
          return 5
        }
        return priority(a.id) - priority(b.id)
      })
      .map(model => ({
        id: model.id,
        name: model.id,
        owned_by: model.owned_by,
        created: model.created
      }))

    return NextResponse.json({ models: chatModels })
  } catch (error) {
    console.error('Models API error:', error)
    
    const errorObj = error as any
    
    if (errorObj?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: errorObj?.message || 'Failed to fetch models' },
      { status: 500 }
    )
  }
}