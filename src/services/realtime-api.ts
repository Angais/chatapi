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
      
      // Get voice from chat store
      const { voice } = useChatStore.getState()
      
      // Create ephemeral session for security
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
        throw new Error(errorData.error || 'Failed to create session')
      }

      const sessionData = await sessionResponse.json()
      const ephemeralKey = sessionData.client_secret.value

      const url = `wss://api.openai.com/v1/realtime?model=${model}`
      
      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${ephemeralKey}`,
        'openai-beta.realtime-v1'
      ])

      this.setupEventHandlers()
      
      const voiceMode = useChatStore.getState().voiceMode
      if (voiceMode === 'voice-to-voice') {
        await this.setupAudioInput()
      }
    } catch (error) {
      console.error('Failed to connect to Realtime API:', error)
      this.config.onError?.(error)
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('Connected to Realtime API')
      this.isConnected = true
      this.config.onConnectionChange?.(true)
      
      // Configure session for voice-to-voice with both text and audio
      this.sendEvent({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'], // Need both for audio output
          voice: useChatStore.getState().voice || 'alloy', // Use voice from store
          instructions: 'You are a helpful assistant.',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          temperature: useChatStore.getState().temperature // Use temperature from store
        }
      })
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleServerEvent(data)
      } catch (error) {
        console.error('Failed to parse server event:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.config.onError?.(error)
    }

    this.ws.onclose = () => {
      console.log('Disconnected from Realtime API')
      this.isConnected = false
      this.config.onConnectionChange?.(false)
      this.cleanup()
    }
  }

  private handleServerEvent(event: any) {
    this.config.onMessage?.(event)
    
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        console.log('Session event:', event.type)
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
        console.error('Server error:', event.error || event)
        this.config.onError?.(event.error || event)
        break
        
      default:
        // Ignore common events to reduce console noise
        if (!['response.text.delta', 'response.text.done', 'response.content_part.added', 
             'response.content_part.done', 'rate_limits.updated'].includes(event.type)) {
          console.log('Unhandled event:', event.type)
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
      this.ws.send(JSON.stringify(event))
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