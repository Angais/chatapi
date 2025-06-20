import { VoiceMode } from '@/stores/chat-store'
import { useChatStore } from '@/stores/chat-store'

interface RealtimeConfig {
  apiKey: string
  model?: string
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse'
  onMessage?: (message: any) => void
  onError?: (error: any) => void
  onConnectionChange?: (connected: boolean) => void
  onAudioData?: (audioData: string) => void
  onTranscript?: (transcript: string, isFinal: boolean) => void
  initialMessages?: Array<{ role: string; content: string }>
}

export class RealtimeAPIService {
  private ws: WebSocket | null = null
  private config: RealtimeConfig
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private audioWorkletNode: AudioWorkletNode | null = null
  private isConnected = false

  constructor(config: RealtimeConfig) {
    this.config = config
  }

  getIsConnected() {
    return this.isConnected
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('Already connected to Realtime API')
      return
    }

    try {
      const model = this.config.model || 'gpt-4o-realtime-preview'
      console.log('🚀 Starting connection to Realtime API with model:', model)
      
      // Get voice from chat store
      const { voice } = useChatStore.getState()
      console.log('🎤 Using voice:', voice)
      
      // Create ephemeral session for security
      console.log('🔑 Creating ephemeral session...')
      const sessionResponse = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          voice: voice || 'alloy', // Use voice from store
        }),
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        console.error('❌ Failed to create ephemeral session:', errorData)
        throw new Error(errorData.error || 'Failed to create session')
      }

      const sessionData = await sessionResponse.json()
      const ephemeralKey = sessionData.client_secret.value
      console.log('✅ Ephemeral session created successfully')

      const url = `wss://api.openai.com/v1/realtime?model=${model}`
      console.log('🌐 Connecting to WebSocket:', url)
      
      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${ephemeralKey}`,
        'openai-beta.realtime-v1'
      ])

      // Add connection timeout
      return new Promise<void>((resolve, reject) => {
        let connectionTimeout: NodeJS.Timeout | null = null
        let isResolved = false

        const cleanup = () => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout)
            connectionTimeout = null
          }
        }

        const resolveOnce = () => {
          if (!isResolved) {
            isResolved = true
            cleanup()
            resolve()
          }
        }

        const rejectOnce = (error: any) => {
          if (!isResolved) {
            isResolved = true
            cleanup()
            reject(error)
          }
        }

        // Set 10 second timeout
        connectionTimeout = setTimeout(() => {
          console.error('⏰ Connection timeout after 10 seconds')
          if (this.ws) {
            this.ws.close()
          }
          rejectOnce(new Error('Connection timeout after 10 seconds'))
        }, 10000)

        this.setupEventHandlers(resolveOnce, rejectOnce)
        
        const voiceMode = useChatStore.getState().voiceMode
        if (voiceMode === 'voice-to-voice') {
          this.setupAudioInput().catch((error) => {
            console.error('❌ Failed to setup audio input:', error)
            rejectOnce(error)
          })
        }
      })
    } catch (error) {
      console.error('❌ Failed to connect to Realtime API:', error)
      this.config.onError?.(error)
      throw error
    }
  }

  private setupEventHandlers(resolve: () => void, reject: (error: any) => void) {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('Connected to Realtime API')
      this.isConnected = true
      this.config.onConnectionChange?.(true)
      
      // Configure session for voice-to-voice with both text and audio
      const state = useChatStore.getState()
      
      // Adjust temperature to valid range for Realtime API (0.6 - 1.2)
      let adjustedTemperature = state.temperature
      let temperatureWarning = ''
      
      if (state.temperature < 0.6) {
        adjustedTemperature = 0.6
        temperatureWarning = `Temperature adjusted from ${state.temperature} to 0.6 (minimum for Realtime API)`
      } else if (state.temperature > 1.2) {
        adjustedTemperature = 1.2
        temperatureWarning = `Temperature adjusted from ${state.temperature} to 1.2 (maximum for Realtime API)`
      }
      
      // Show warning if temperature was adjusted
      if (temperatureWarning) {
        console.warn('⚠️ ' + temperatureWarning)
        // Use the existing unsupported model disclaimer system to show the warning
        const { setUnsupportedModelError } = useChatStore.getState()
        setUnsupportedModelError(temperatureWarning)
      }
      
      // Build turn_detection configuration based on VAD type
      let turnDetection: any
      if (state.vadType === 'semantic_vad') {
        turnDetection = {
          type: 'semantic_vad',
          eagerness: state.vadEagerness || 'medium'
        }
      } else {
        turnDetection = {
          type: 'server_vad',
          threshold: state.vadThreshold,
          prefix_padding_ms: state.vadPrefixPadding,
          silence_duration_ms: state.vadSilenceDuration
        }
      }
      
      // Build instructions with conversation history context
      let instructions = state.systemInstructions.trim() || 'You are a helpful assistant.'
      
      // If we have conversation history, append it to the instructions
      if (this.config.initialMessages && this.config.initialMessages.length > 0) {
        const conversationContext = this.config.initialMessages
          .filter(msg => msg.role !== 'system') // Exclude system messages
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n')
        
        instructions = `${instructions}\n\nHere is the conversation history so far:\n\n${conversationContext}\n\nPlease continue the conversation naturally, taking into account this previous context.`
      }
      
      const sessionUpdateMessage = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: state.voice || 'alloy',
          instructions: instructions,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: turnDetection,
          temperature: adjustedTemperature,
          // Add transcription settings
          input_audio_transcription: {
            model: state.transcriptionModel,
            language: state.transcriptionLanguage,
          }
        }
      }
      
      console.log('📤 Sending session.update message with conversation context in instructions')
      this.sendEvent(sessionUpdateMessage)
      
      // Send initial conversation history if provided
      if (this.config.initialMessages && this.config.initialMessages.length > 0) {
        console.log('📤 Sending conversation history:', this.config.initialMessages.length, 'messages')
        
        // Wait a bit after session setup before sending conversation items
        setTimeout(() => {
          this.config.initialMessages?.forEach((message, index) => {
            // Skip system messages - they're handled in session configuration
            if (message.role === 'system') return
            
            let conversationItem: any
            
            if (message.role === 'user') {
              // User messages use 'input_text' content type
              conversationItem = {
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [
                    {
                      type: 'input_text',
                      text: message.content
                    }
                  ]
                }
              }
            } else if (message.role === 'assistant') {
              // Assistant messages use 'text' content type
              conversationItem = {
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'assistant',
                  content: [
                    {
                      type: 'text',
                      text: message.content
                    }
                  ]
                }
              }
            }
            
            // Add a delay between messages to ensure proper ordering
            setTimeout(() => {
              console.log(`📤 Sending ${message.role} message with content type: ${message.role === 'user' ? 'input_text' : 'text'}`)
              this.sendEvent(conversationItem)
            }, 100 + (index * 100)) // Start after 100ms, then 100ms between each
          })
        }, 500) // Wait 500ms after session setup
      }
      
      resolve()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📥 Received event:', data.type, data)
        this.handleServerEvent(data)
      } catch (error) {
        console.error('❌ Failed to parse server event:', error, 'Raw data:', event.data)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.config.onError?.(error)
      reject(error)
    }

    this.ws.onclose = () => {
      console.log('Disconnected from Realtime API')
      this.isConnected = false
      this.config.onConnectionChange?.(false)
      this.cleanup()
      reject(new Error('Disconnected from Realtime API'))
    }
  }

  private handleServerEvent(event: any) {
    this.config.onMessage?.(event)
    
    switch (event.type) {
      case 'session.created':
        console.log('✅ Session created successfully:', event)
        break
        
      case 'session.updated':
        console.log('✅ Session updated successfully:', event)  
        break
        
      case 'response.audio.delta':
        if (event.delta) {
          this.config.onAudioData?.(event.delta)
        }
        break
        
      case 'response.audio_transcript.delta':
        if (event.delta) {
          this.config.onTranscript?.(event.delta, false)
        }
        break
        
      case 'response.audio_transcript.done':
        if (event.transcript) {
          this.config.onTranscript?.(event.transcript, true)
        }
        break
        
      case 'input_audio_buffer.speech_started':
      case 'input_audio_buffer.speech_stopped':
      case 'input_audio_buffer.committed':
      case 'conversation.item.created':
      case 'response.created':
      case 'response.done':
      case 'response.output_item.added':
      case 'response.output_item.done':
        // Silently handle these events
        break
        
      case 'error':
        console.error('❌ Server error details:', JSON.stringify(event, null, 2))
        console.error('❌ Error type:', event.error?.type)
        console.error('❌ Error code:', event.error?.code)
        console.error('❌ Error message:', event.error?.message)
        console.error('❌ Error param:', event.error?.param)
        this.config.onError?.(event.error || event)
        break
        
      default:
        // Ignore common events to reduce console noise
        if (!['response.text.delta', 'response.text.done', 'response.content_part.added', 
             'response.content_part.done', 'rate_limits.updated'].includes(event.type)) {
          console.log('🔍 Unhandled event:', event.type, event)
        }
    }
  }

  async setupAudioInput() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      // Create audio context with specific sample rate
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
      
      // Create source from media stream
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      
      // Create script processor for capturing audio
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      processor.onaudioprocess = (e) => {
        if (!this.isConnected) return
        
        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = this.floatTo16BitPCM(inputData)
        const base64 = this.arrayBufferToBase64(pcm16)
        
        this.sendEvent({
          type: 'input_audio_buffer.append',
          audio: base64
        })
      }
      
      source.connect(processor)
      processor.connect(this.audioContext.destination)
      
      // Don't trigger response.create here - let VAD handle it
      console.log('Audio input setup complete')
    } catch (error) {
      console.error('Failed to setup audio input:', error)
      this.config.onError?.(error)
    }
  }

  sendEvent(event: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📡 Sending event:', event.type, this.ws.readyState === WebSocket.OPEN ? '(connected)' : '(not connected)')
      this.ws.send(JSON.stringify(event))
    } else {
      console.error('❌ Cannot send event - WebSocket not ready:', event.type, 'ReadyState:', this.ws?.readyState)
    }
  }

  sendTextMessage(text: string) {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    })

    // Trigger response generation
    this.sendEvent({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    })
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)
    let offset = 0
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return buffer
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000 // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    return btoa(binary)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
    }
    this.cleanup()
  }

  private cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.audioWorkletNode = null
    this.ws = null
  }
}