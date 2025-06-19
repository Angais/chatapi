import { useState, useRef, useCallback, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { RealtimeAPIService } from '@/services/realtime-api'
import { AudioPlayer } from '@/services/audio-player'

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
  } = useChatStore()

  // Initialize services
  useEffect(() => {
    if (isRealtimeModel() && voiceMode !== 'none') {
      // Always create a new audio player instance when entering voice mode
      console.log('Initializing audio player for voice mode:', voiceMode)
      audioPlayer.current = new AudioPlayer()
    } else {
      // Cleanup when not using voice
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
    }
    
    // Cleanup on unmount
    return () => {
      if (audioPlayer.current) {
        audioPlayer.current.cleanup()
        audioPlayer.current = null
      }
    }
  }, [voiceMode, isRealtimeModel])

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
    console.log('🎯 Connecting to Realtime API...', { voiceMode: currentVoiceMode, selectedModel })

    if (currentVoiceMode === 'voice-to-voice') {
      const hasAccess = await checkPermission()
      if (!hasAccess) {
        throw new Error('Microphone permission denied')
      }
    }

    try {
      realtimeService.current = new RealtimeAPIService({
        apiKey,
        model: selectedModel,
        voice: 'alloy',
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
  }, [selectedModel, checkPermission])

  // Send text message for text-to-voice mode
  const sendTextMessage = useCallback((text: string) => {
    console.log('sendTextMessage called', { text, hasService: !!realtimeService.current })

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