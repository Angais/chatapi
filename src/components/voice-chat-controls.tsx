'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Phone, PhoneOff, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { useVoiceChat } from '@/hooks/use-voice-chat'
import { cn } from '@/lib/utils'

export function VoiceChatControls() {
  const { voiceMode, isRealtimeModel, messages, isVoiceSessionEnded, setVoiceSessionEnded } = useChatStore()
  const {
    isConnected,
    isRecording,
    hasPermission,
    currentTranscript,
    connect,
    disconnect,
    toggleRecording,
  } = useVoiceChat()

  const [isConnecting, setIsConnecting] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [, forceUpdate] = useState({})
  
  // Check if we should auto-initiate connection based on having messages
  const hasMessages = messages.length > 0

  // Calculate elapsed time based on start time
  const getElapsedSeconds = () => {
    if (!sessionStartTime || !isConnected) return 0
    return Math.floor((Date.now() - sessionStartTime) / 1000)
  }

  // Format elapsed time as MM:SS or HH:MM:SS
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Update timer display every second when connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isConnected) {
      // Force re-render every second to update the timer display
      interval = setInterval(() => {
        forceUpdate({})
      }, 1000)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isConnected])

  // Set/clear session start time based on connection status
  useEffect(() => {
    if (isConnected && !sessionStartTime) {
      setSessionStartTime(Date.now())
    } else if (!isConnected && sessionStartTime) {
      setSessionStartTime(null)
    }
  }, [isConnected, sessionStartTime])

  const handleConnect = useCallback(async () => {
    try {
      setIsConnecting(true)
      setVoiceSessionEnded(false) // User is actively starting a session
      await connect()
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [connect, setVoiceSessionEnded])

  if (!isRealtimeModel() || voiceMode === 'none') {
    return null
  }

  const handleDisconnect = () => {
    disconnect()
    setVoiceSessionEnded(true)
  }

  const isSessionActive = isConnected || isConnecting
  const elapsedSeconds = getElapsedSeconds()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-col items-center gap-3 p-4 border-t bg-background"
    >
      {/* Main controls */}
      <div className="flex items-center gap-3">
        {/* Text-to-voice controls */}
        {voiceMode === 'text-to-voice' && (
          isSessionActive ? (
            <>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="flex items-center gap-2 rounded-full px-4 py-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                disabled={isConnecting}
              >
                <PhoneOff className="h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'End Voice Session'}
              </Button>
              
              {isConnected && (
                <motion.div
                  className="flex items-center gap-3"
                >
                  <motion.div
                    className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-green-500 rounded-full"
                    />
                    Voice session active
                  </motion.div>
                  
                  {/* Session timer */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full"
                  >
                    <Clock className="h-3 w-3" />
                    <span className="font-mono">{formatElapsedTime(elapsedSeconds)}</span>
                  </motion.div>
                </motion.div>
              )}
              
              {isConnecting && (
                <motion.div
                  className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Phone className="h-3 w-3" />
                  </motion.div>
                  Establishing voice connection...
                </motion.div>
              )}
            </>
          ) : (
            // Always show the start button instead of checking for messages
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 cursor-pointer",
                "bg-green-600 hover:bg-green-700 text-white",
                "dark:bg-green-600 dark:hover:bg-green-700 dark:text-white"
              )}
            >
              <Phone className="h-4 w-4" />
              Start Voice Session
            </Button>
          )
        )}

        {/* Voice-to-voice controls */}
        {voiceMode === 'voice-to-voice' && (
          <>
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting || hasPermission === false}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 cursor-pointer",
                  "bg-green-600 hover:bg-green-700 text-white",
                  "dark:bg-green-600 dark:hover:bg-green-700 dark:text-white"
                )}
              >
                {isConnecting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Phone className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleRecording}
                  className={cn(
                    "rounded-full w-12 h-12 p-0 cursor-pointer",
                    isRecording 
                      ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <motion.div
                    animate={isRecording ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </motion.div>
                </Button>
                
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="rounded-full cursor-pointer"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
                
                {/* Session timer for voice-to-voice */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full"
                >
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">{formatElapsedTime(elapsedSeconds)}</span>
                </motion.div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Permission warning */}
      <AnimatePresence>
        {hasPermission === false && voiceMode === 'voice-to-voice' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-orange-600 dark:text-orange-400 text-center bg-orange-50 dark:bg-orange-950 p-2 rounded-lg"
          >
            Microphone access is required for voice chat. Please allow microphone permissions.
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Current transcript */}
      <AnimatePresence>
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-muted-foreground bg-muted p-2 rounded-lg max-w-md text-center"
          >
            {currentTranscript}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}