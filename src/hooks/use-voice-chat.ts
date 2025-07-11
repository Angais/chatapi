import { useState, useRef, useCallback, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { RealtimeAPIService } from '@/services/realtime-api'
import { AudioPlayer } from '@/services/audio-player'

const isValidVoice = (voice: string): voice is 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' => {
  return ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'].includes(voice)
}

export function useVoiceChat() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState('')
  
  const realtimeService = useRef<RealtimeAPIService | null>(null)
  const audioPlayer = useRef<AudioPlayer | null>(null)
  
  const { 
    voiceMode, 
    selectedModel, 
    addMessage,
    isRealtimeModel,
    setUnsupportedModelError,
    voice,
  } = useChatStore()

  // Initialize/cleanup services whenever voice-chat settings change
  useEffect(() => {
    // Always tear-down current session so the next one picks up new settings
    if (realtimeService.current) {
      realtimeService.current.disconnect()
      realtimeService.current = null
    }
    if (audioPlayer.current) {
      audioPlayer.current.cleanup()
      audioPlayer.current = null
    }
    setIsConnected(false)
    setIsRecording(false)
    setCurrentTranscript('')

    // Re-create a fresh audio player when voice chat is active
    if (isRealtimeModel() && voiceMode !== 'none') {
      console.log('Initializing audio player:',
        { voiceMode, voice })
      audioPlayer.current = new AudioPlayer()
    }

    // Extra cleanup on unmount
    return () => {
      if (audioPlayer.current) {
        audioPlayer.current.cleanup()
        audioPlayer.current = null
      }
    }
  }, [voiceMode, isRealtimeModel, voice])

  // Check microphone permission
  const checkPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      return true
    } catch (error) {
      setHasPermission(false)
      return false
    }
  }, [])

  // Connect to Realtime API
  const connect = useCallback(async () => {
    const apiKey = localStorage.getItem('openai_api_key')
    if (!apiKey) {
      console.error('❌ No API key found in localStorage')
      throw new Error('No API key found. Please set your OpenAI API key in settings.')
    }

    const currentVoiceMode = useChatStore.getState().voiceMode
    const messages = useChatStore.getState().messages
    const systemInstructions = useChatStore.getState().systemInstructions
    const currentVoice = useChatStore.getState().voice
    
    console.log('🎯 Connecting to Realtime API...', { voiceMode: currentVoiceMode, selectedModel, messageCount: messages.length, voice: currentVoice })
    if (!isValidVoice(currentVoice)) {
      console.warn('⚠️ Selected voice is invalid, defaulting to alloy')
    }

    if (currentVoiceMode === 'voice-to-voice') {
      const hasAccess = await checkPermission()
      if (!hasAccess) {
        throw new Error('Microphone permission denied')
      }
    }

    try {
      // Prepare initial messages from chat history
      const initialMessages = []
      
      // Add system message if there are existing messages
      if (messages.length > 0 && systemInstructions.trim()) {
        initialMessages.push({
          role: 'system',
          content: systemInstructions.trim()
        })
      }
      
      // Add existing conversation messages
      messages.forEach(msg => {
        initialMessages.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        })
      })
      
      realtimeService.current = new RealtimeAPIService({
        apiKey,
        model: selectedModel,
        voice: isValidVoice(currentVoice) ? currentVoice : 'alloy',
        initialMessages: initialMessages.length > 0 ? initialMessages : undefined,
        onConnectionChange: (connected) => {
          console.log('🔄 Connection status changed:', connected)
          setIsConnected(connected)
        },
        onAudioData: (audioData) => {
          if (audioPlayer.current) {
            audioPlayer.current.playBase64Audio(audioData)
          }
        },
        onTranscript: (transcript, isFinal) => {
          if (isFinal) {
            // Add the final transcript as an AI message
            addMessage(transcript, false)
            setCurrentTranscript('')
          } else {
            setCurrentTranscript(transcript)
          }
        },
        onError: (error) => {
          console.error('❌ Realtime API error:', error)
          setIsConnected(false)
        }
      })

      await realtimeService.current.connect()
      console.log('✅ Successfully connected to Realtime API')
    } catch (error) {
      console.error('❌ Failed to connect to Realtime API:', error)
      throw error
    }
  }, [selectedModel, checkPermission, addMessage, voice])

  // Send text message for text-to-voice mode
  const sendTextMessage = useCallback((text: string) => {
    console.log('sendTextMessage called', { text, hasService: !!realtimeService.current })

    // ✨ NEW: stop any in-progress playback so the next response
    //        can start cleanly.
    if (audioPlayer.current) {
      audioPlayer.current.stop()
    }

    // Add user message immediately to start the chat
    addMessage(text, true)

    if (realtimeService.current && realtimeService.current.getIsConnected()) {
      realtimeService.current.sendTextMessage(text)
    } else {
      console.warn('Cannot send message - not connected or no service')
    }
  }, [addMessage])

  // Start/stop recording for voice-to-voice mode
  const toggleRecording = useCallback(async () => {
    if (!isConnected) {
      await connect()
    }
    
    setIsRecording(!isRecording)
  }, [isConnected, isRecording, connect])

  // Disconnect
  const disconnect = useCallback(() => {
    if (realtimeService.current) {
      realtimeService.current.disconnect()
      realtimeService.current = null
    }
    if (audioPlayer.current) {
      audioPlayer.current.stop()
    }
    
    // Clear any temperature warnings when disconnecting
    setUnsupportedModelError(null)
    
    setIsConnected(false)
    setIsRecording(false)
    setCurrentTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
      if (audioPlayer.current) {
        audioPlayer.current.cleanup()
      }
    }
  }, [disconnect])

  return {
    isConnected,
    isRecording,
    hasPermission,
    currentTranscript,
    connect,
    disconnect,
    sendTextMessage,
    toggleRecording,
    checkPermission,
  }
}