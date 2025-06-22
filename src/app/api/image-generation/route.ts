import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey, model, quality, streaming, aspectRatio, messages, inputImages } = await request.json()

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
    const imageAspectRatio = aspectRatio || 'square'

    // Map aspect ratio to actual size
    const getSizeFromAspectRatio = (ratio: string) => {
      switch (ratio) {
        case 'square': return '1024x1024'
        case 'portrait': return '1024x1536'
        case 'landscape': return '1536x1024'
        case 'auto': return 'auto'
        default: return '1024x1024'
      }
    }

    const imageSize = getSizeFromAspectRatio(imageAspectRatio)

    console.log('🎬 [API] Starting image generation:', { 
      selectedModel, 
      imageQuality, 
      isStreaming, 
      imageAspectRatio, 
      imageSize,
      hasInputImages: !!(inputImages && inputImages.length > 0),
      hasMultiTurnContext: !!(messages && messages.length > 1)
    })

    // For streaming image generation using Responses API
    if (isStreaming) {
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('🎬 [API] Creating responses stream...')
            
            // Prepare input for Responses API - use full conversation context if available
            let apiInput: any = messages && messages.length > 0 ? messages : prompt

            // If we have input images, we need to format the input properly for image editing
            if (inputImages && inputImages.length > 0) {
              // Convert messages format to include input images
              if (Array.isArray(apiInput)) {
                // Find the last user message and add images to it
                const lastUserMessageIndex = apiInput.findLastIndex((msg: any) => msg.role === 'user')
                if (lastUserMessageIndex !== -1) {
                  const lastUserMessage = apiInput[lastUserMessageIndex]
                  
                  // Ensure content is an array
                  if (typeof lastUserMessage.content === 'string') {
                    lastUserMessage.content = [
                      { type: 'input_text', text: lastUserMessage.content }
                    ]
                  }
                  
                  // Add input images
                  inputImages.forEach((imageUrl: string) => {
                    lastUserMessage.content.push({
                      type: 'input_image',
                      image_url: imageUrl
                    })
                  })
                }
              } else {
                // Single prompt with images
                apiInput = [
                  {
                    role: 'user',
                    content: [
                      { type: 'input_text', text: prompt },
                      ...inputImages.map((imageUrl: string) => ({
                        type: 'input_image',
                        image_url: imageUrl
                      }))
                    ]
                  }
                ]
              }
            }

            // Use Responses API for real streaming with multi-turn support
            const responseStream = await openai.responses.create({
              model: selectedModel,
              input: apiInput,
              stream: true,
              tools: [{ 
                type: "image_generation",
                partial_images: 2, // Get 2 partial images during generation
                quality: imageQuality,
                size: imageSize !== 'auto' ? imageSize : undefined,
              }],
            })

            console.log('🎬 [API] Response stream created, processing events...')

            let lastPartialImage = ''
            let finalImageSent = false
            let imageGenerationId = ''

            for await (const event of responseStream) {
              console.log('🎬 [API] Received event type:', event.type)
              
              // Cast to any to avoid TypeScript issues with new API types
              const eventAny = event as any
              
              if (eventAny.type === "response.image_generation_call.partial_image") {
                const partialIndex = eventAny.partial_image_index
                const imageBase64 = eventAny.partial_image_b64
                const progress = Math.round(((partialIndex + 1) / 3) * 100) // Assuming 3 total steps
                
                console.log(`🎬 [API] Partial image ${partialIndex} received, progress: ${progress}%`)
                
                // Store the latest image as potential final image
                lastPartialImage = imageBase64
                
                // Capture the image generation ID from the call
                if (eventAny.id && !imageGenerationId) {
                  imageGenerationId = eventAny.id
                  console.log('🎬 [API] Captured image generation ID:', imageGenerationId)
                }
                
                const partialData = {
                  type: 'partial_image',
                  image: imageBase64,
                  progress: progress,
                  partial_index: partialIndex,
                  imageGenerationId: imageGenerationId
                }
                
                const partialDataStr = `data: ${JSON.stringify(partialData)}\n\n`
                controller.enqueue(encoder.encode(partialDataStr))
                
              } else if (eventAny.type === "response.image_generation_call.result") {
                console.log('🎬 [API] Final image result received')
                
                // Capture the image generation ID from the result
                if (eventAny.id && !imageGenerationId) {
                  imageGenerationId = eventAny.id
                  console.log('🎬 [API] Captured image generation ID from result:', imageGenerationId)
                }
                
                // Get the final image from the result
                const finalImageBase64 = eventAny.result?.image_b64 || lastPartialImage
                
                if (finalImageBase64) {
                  const finalData = {
                    type: 'complete',
                    image: finalImageBase64,
                    progress: 100,
                    imageGenerationId: imageGenerationId
                  }
                  
                  const finalDataStr = `data: ${JSON.stringify(finalData)}\n\n`
                  controller.enqueue(encoder.encode(finalDataStr))
                  finalImageSent = true
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

            // If we never received a result event but have partial images, send the last one as final
            if (!finalImageSent && lastPartialImage) {
              console.log('🎬 [API] No result event received, sending last partial image as final')
              const finalData = {
                type: 'complete',
                image: lastPartialImage,
                progress: 100,
                imageGenerationId: imageGenerationId
              }
              
              const finalDataStr = `data: ${JSON.stringify(finalData)}\n\n`
              controller.enqueue(encoder.encode(finalDataStr))
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

    // Non-streaming image generation using Responses API for consistency
    try {
      console.log('🎬 [API] Non-streaming generation with Responses API')
      
      // Prepare input for Responses API - use full conversation context if available
      let apiInput: any = messages && messages.length > 0 ? messages : prompt

      // If we have input images, we need to format the input properly for image editing
      if (inputImages && inputImages.length > 0) {
        // Convert messages format to include input images
        if (Array.isArray(apiInput)) {
          // Find the last user message and add images to it
          const lastUserMessageIndex = apiInput.findLastIndex((msg: any) => msg.role === 'user')
          if (lastUserMessageIndex !== -1) {
            const lastUserMessage = apiInput[lastUserMessageIndex]
            
            // Ensure content is an array
            if (typeof lastUserMessage.content === 'string') {
              lastUserMessage.content = [
                { type: 'input_text', text: lastUserMessage.content }
              ]
            }
            
            // Add input images
            inputImages.forEach((imageUrl: string) => {
              lastUserMessage.content.push({
                type: 'input_image',
                image_url: imageUrl
              })
            })
          }
        } else {
          // Single prompt with images
          apiInput = [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: prompt },
                ...inputImages.map((imageUrl: string) => ({
                  type: 'input_image',
                  image_url: imageUrl
                }))
              ]
            }
          ]
        }
      }

      const response = await openai.responses.create({
        model: selectedModel,
        input: apiInput,
        tools: [{ 
          type: "image_generation",
          quality: imageQuality,
          size: imageSize !== 'auto' ? imageSize : undefined,
        }],
      })

      // Extract image and ID from response
      const imageGenerationCalls = response.output
        .filter((output: any) => output.type === "image_generation_call")

      const imageB64 = imageGenerationCalls.length > 0 ? (imageGenerationCalls[0] as any).result : ''
      const imageGenerationId = imageGenerationCalls.length > 0 ? (imageGenerationCalls[0] as any).id : ''

      console.log('🎬 [API] Non-streaming image generation ID:', imageGenerationId)

      return NextResponse.json({
        image: imageB64,
        imageGenerationId: imageGenerationId,
        prompt: prompt,
        model: selectedModel,
        quality: imageQuality,
        aspectRatio: imageAspectRatio,
        size: imageSize,
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