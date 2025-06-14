import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey, model, reasoningEffort } = await request.json()

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
    const reasoningEffortValue = reasoningEffort || 'no-reasoning'

    // Check if this is a reasoning model or if reasoning effort is needed
    const needsReasoningEffort = ['o3', 'o3-pro', 'o4-mini'].includes(selectedModel) || reasoningEffortValue !== 'no-reasoning'

    // Try with standard parameters first for non-reasoning models
    if (!needsReasoningEffort) {
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
          usage: completion.usage,
        })
      } catch (initialError: any) {
        // If we get a parameter error, it might be a reasoning model, try with reasoning parameters
        if (initialError?.status === 400 && 
            initialError?.message?.includes("'max_tokens' is not supported")) {
          
          console.log(`Model ${selectedModel} requires reasoning parameters, retrying...`)
          // Fall through to reasoning model logic
        } else {
          throw initialError
        }
      }
    }

    // Use reasoning model parameters
    const completionParams: any = {
      model: selectedModel,
      messages: messages,
      max_completion_tokens: 1000,
    }

    // Add reasoning effort if it's not 'no-reasoning'
    if (reasoningEffortValue !== 'no-reasoning') {
      completionParams.reasoning_effort = reasoningEffortValue
    }

    try {
      const completion = await openai.chat.completions.create(completionParams)

      const responseMessage = completion.choices[0]?.message?.content || ''

      return NextResponse.json({
        message: responseMessage,
        usage: completion.usage,
      })
    } catch (reasoningError: any) {
      // If reasoning_effort is not supported, retry without it
      if (reasoningError?.status === 400 && 
          (reasoningError?.message?.includes('Unrecognized request argument supplied: reasoning_effort') ||
           reasoningError?.message?.includes('reasoning_effort'))) {
        
        console.log(`Model ${selectedModel} doesn't support reasoning_effort, retrying without it...`)
        
        // Remove reasoning_effort and retry
        const fallbackParams = {
          model: selectedModel,
          messages: messages,
          max_completion_tokens: 1000,
        }

        try {
          const fallbackCompletion = await openai.chat.completions.create(fallbackParams)
          const fallbackMessage = fallbackCompletion.choices[0]?.message?.content || ''

          return NextResponse.json({
            message: fallbackMessage,
            usage: fallbackCompletion.usage,
            // Indicate that reasoning was not supported for this model
            reasoningNotSupported: true,
          })
        } catch (fallbackError: any) {
          // If fallback also fails, try with standard parameters
          console.log(`Max completion tokens not supported, trying with standard parameters...`)
          
          const standardParams = {
            model: selectedModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }

          const standardCompletion = await openai.chat.completions.create(standardParams)
          const standardMessage = standardCompletion.choices[0]?.message?.content || ''

          return NextResponse.json({
            message: standardMessage,
            usage: standardCompletion.usage,
            reasoningNotSupported: true,
          })
        }
      }
      
      // If it's a different error, throw it
      throw reasoningError
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