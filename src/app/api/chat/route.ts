import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey, model } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const selectedModel = model || 'gpt-4o-mini'

    // Try with standard parameters first
    try {
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      })

      const responseMessage = completion.choices[0]?.message?.content || ''

      return NextResponse.json({
        message: responseMessage,
      })
    } catch (initialError: any) {
      // If we get a parameter error, try with reasoning model parameters
      if (initialError?.status === 400 && 
          initialError?.message?.includes("'max_tokens' is not supported")) {
        
        console.log(`Model ${selectedModel} requires reasoning parameters, retrying...`)
        
        const completion = await openai.chat.completions.create({
          model: selectedModel,
          messages: messages,
          max_completion_tokens: 1000,
          // Reasoning models don't support temperature, top_p, etc.
        })

        const responseMessage = completion.choices[0]?.message?.content || ''

        return NextResponse.json({
          message: responseMessage,
        })
      }
      
      // If it's a different error, throw it to be handled below
      throw initialError
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    const errorObj = error as any
    
    if (errorObj?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    if (errorObj?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: errorObj?.message || 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}