import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey, model, quality, streaming } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Text prompt is required for image generation' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const selectedModel = model || 'gpt-4o'
    const imageQuality = quality || 'medium'
    const isStreaming = streaming === 'enabled'

    console.log('🎬 [API] Starting image generation:', { selectedModel, imageQuality, isStreaming })

    // For streaming image generation using Responses API
    if (isStreaming) {
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('🎬 [API] Creating responses stream...')
            
            // Use Responses API for real streaming
            const responseStream = await openai.responses.create({
              model: selectedModel,
              input: prompt,
              stream: true,
              tools: [{ 
                type: "image_generation", 
                partial_images: 2 // Get 2 partial images during generation
              }],
            })

            console.log('🎬 [API] Response stream created, processing events...')

            for await (const event of responseStream) {
              console.log('🎬 [API] Received event type:', event.type)
              
              // Cast to any to avoid TypeScript issues with new API types
              const eventAny = event as any
              
              if (eventAny.type === "response.image_generation_call.partial_image") {
                const partialIndex = eventAny.partial_image_index
                const imageBase64 = eventAny.partial_image_b64
                const progress = Math.round(((partialIndex + 1) / 3) * 100) // Assuming 3 total steps
                
                console.log(`🎬 [API] Partial image ${partialIndex} received, progress: ${progress}%`)
                
                const partialData = {
                  type: 'partial_image',
                  image: imageBase64,
                  progress: progress,
                  partial_index: partialIndex
                }
                
                const partialDataStr = `data: ${JSON.stringify(partialData)}\n\n`
                controller.enqueue(encoder.encode(partialDataStr))
                
              } else if (eventAny.type === "response.image_generation_call.result") {
                console.log('🎬 [API] Final image result received')
                
                // Get the final image from the result
                const finalImageBase64 = eventAny.result?.image_b64 || ''
                
                if (finalImageBase64) {
                  const finalData = {
                    type: 'complete',
                    image: finalImageBase64,
                    progress: 100
                  }
                  
                  const finalDataStr = `data: ${JSON.stringify(finalData)}\n\n`
                  controller.enqueue(encoder.encode(finalDataStr))
                }
                
              } else if (eventAny.type === "error") {
                console.error('🎬 [API] Stream error:', eventAny.error)
                
                const errorData = {
                  type: 'error',
                  error: eventAny.error?.message || 'Image generation failed'
                }
                
                const errorDataStr = `data: ${JSON.stringify(errorData)}\n\n`
                controller.enqueue(encoder.encode(errorDataStr))
              }
            }

            console.log('🎬 [API] Stream completed')
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            
          } catch (error: any) {
            console.error('🎬 [API] Image generation streaming error:', error)
            
            const errorData = {
              type: 'error',
              error: error?.message || 'Image generation failed',
              unsupportedModel: error?.status === 400 || error?.status === 404 || error?.status === 403
            }
            
            const errorDataStr = `data: ${JSON.stringify(errorData)}\n\n`
            controller.enqueue(encoder.encode(errorDataStr))
            controller.close()
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

    // Non-streaming image generation using regular Images API
    try {
      console.log('🎬 [API] Non-streaming generation with Images API')
      
      const baseParams: any = {
        model: 'dall-e-3', // Use DALL-E for non-streaming
        prompt: prompt,
        size: "1024x1024",
        quality: imageQuality === 'low' ? 'standard' : 'hd',
        response_format: "b64_json"
      }

      const imageResponse = await openai.images.generate(baseParams)
      const imageB64 = imageResponse.data?.[0]?.b64_json || ''

      return NextResponse.json({
        image: imageB64,
        prompt: prompt,
        model: 'dall-e-3',
        quality: imageQuality,
      })
      
    } catch (imageError: any) {
      console.error('🎬 [API] Image generation error:', imageError)
      
      if (imageError?.status === 400 || imageError?.status === 404 || imageError?.status === 403) {
        return NextResponse.json(
          { 
            error: 'This model is not supported for image generation or the parameters are invalid',
            unsupportedModel: true 
          },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: imageError?.message || 'An error occurred during image generation' },
          { status: 500 }
        )
      }
    }
  } catch (error: any) {
    console.error('🎬 [API] Image generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 