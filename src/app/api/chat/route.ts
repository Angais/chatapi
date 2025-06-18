import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey, model, reasoningEffort, stream, temperature, maxTokens } = await request.json()

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

    // Use provided temperature and maxTokens or defaults
    const finalTemperature = temperature ?? 0.7
    const finalMaxTokens = maxTokens ?? 1000

    // For streaming requests
    if (stream) {
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Try with standard parameters first for non-reasoning models
            let completionParams: any = {
              model: selectedModel,
              messages: messages,
              stream: true,
            }

            if (!needsReasoningEffort) {
              completionParams.temperature = finalTemperature
              completionParams.max_tokens = finalMaxTokens
            } else {
              completionParams.max_completion_tokens = finalMaxTokens
              if (reasoningEffortValue !== 'no-reasoning') {
                completionParams.reasoning_effort = reasoningEffortValue
              }
            }

            const completion = await openai.chat.completions.create(completionParams) as any

            for await (const chunk of completion) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`
              controller.enqueue(encoder.encode(data))
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error: any) {
            console.error('Streaming error:', error)
            
            // Handle different error types with fallback attempts
            if (error?.status === 400) {
              try {
                // Try fallback with different parameters
                let fallbackParams: any = {
                  model: selectedModel,
                  messages: messages,
                  stream: true,
                }

                if (error?.message?.includes("'max_tokens' is not supported")) {
                  fallbackParams.max_completion_tokens = finalMaxTokens
                } else if (error?.message?.includes('reasoning_effort')) {
                  fallbackParams.max_completion_tokens = finalMaxTokens
                } else {
                  fallbackParams.temperature = finalTemperature
                  fallbackParams.max_tokens = finalMaxTokens
                }

                                 const fallbackCompletion = await openai.chat.completions.create(fallbackParams) as any

                 for await (const chunk of fallbackCompletion) {
                   const data = `data: ${JSON.stringify(chunk)}\n\n`
                   controller.enqueue(encoder.encode(data))
                 }

                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
              } catch (fallbackError: any) {
                const errorData = `data: ${JSON.stringify({
                  error: fallbackError?.message || 'An error occurred',
                  unsupportedModel: fallbackError?.status === 400 || fallbackError?.status === 404 || fallbackError?.status === 403
                })}\n\n`
                controller.enqueue(encoder.encode(errorData))
                controller.close()
              }
            } else {
              const errorData = `data: ${JSON.stringify({
                error: error?.message || 'An error occurred',
                status: error?.status
              })}\n\n`
              controller.enqueue(encoder.encode(errorData))
              controller.close()
            }
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming logic (keep existing code for backwards compatibility)
    // Try with standard parameters first for non-reasoning models
    if (!needsReasoningEffort) {
      try {
        const completion = await openai.chat.completions.create({
          model: selectedModel,
          messages: messages,
          temperature: finalTemperature,
          max_tokens: finalMaxTokens,
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
        } else if (initialError?.status === 400 || initialError?.status === 404 || initialError?.status === 403) {
          // Treat as unsupported model error
          return NextResponse.json(
            { 
              error: 'This model is not supported',
              unsupportedModel: true 
            },
            { status: 400 }
          )
        } else {
          throw initialError
        }
      }
    }

    // Use reasoning model parameters
    const completionParams: any = {
      model: selectedModel,
      messages: messages,
      max_completion_tokens: finalMaxTokens,
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
          max_completion_tokens: finalMaxTokens,
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
            temperature: finalTemperature,
            max_tokens: finalMaxTokens,
          }

          try {
            const standardCompletion = await openai.chat.completions.create(standardParams)
            const standardMessage = standardCompletion.choices[0]?.message?.content || ''

            return NextResponse.json({
              message: standardMessage,
              usage: standardCompletion.usage,
              reasoningNotSupported: true,
            })
          } catch (standardError: any) {
            // If all fallbacks fail, this is an unsupported model error
            return NextResponse.json(
              { 
                error: 'This model is not supported',
                unsupportedModel: true 
              },
              { status: 400 }
            )
          }
        }
      }
      
      // For other 400/404/403 errors that are not reasoning-related, treat as unsupported model
      if (reasoningError?.status === 400 || reasoningError?.status === 404 || reasoningError?.status === 403) {
        return NextResponse.json(
          { 
            error: 'This model is not supported',
            unsupportedModel: true 
          },  
          { status: 400 }
        )
      }
      
      // If it's a different error (not 400), throw it
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