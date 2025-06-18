'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { useVoiceChat } from '@/hooks/use-voice-chat'
import { cn } from '@/lib/utils'

export function VoiceChatControls() {
  const { voiceMode, isRealtimeModel, messages } = useChatStore()
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
  
  // Check if we should auto-initiate connection based on having messages
  const hasMessages = messages.length > 0
  const [hasInitiatedConnection, setHasInitiatedConnection] = useState(hasMessages)

  // Auto-initiate connection when switching to text-to-voice with existing messages
  useEffect(() => {
    if (voiceMode === 'text-to-voice' && hasMessages && !isConnected && !isConnecting && !hasInitiatedConnection) {
      handleConnect()
    }
  }, [voiceMode, hasMessages, isConnected, isConnecting])

  if (!isRealtimeModel() || voiceMode === 'none') {
    return null
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setHasInitiatedConnection(true)
      await connect()
    } catch (error) {
      console.error('Failed to connect:', error)
      setHasInitiatedConnection(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setHasInitiatedConnection(false)
  }

  // Show controls if connected, connecting, or connection has been initiated
  const shouldShowTextToVoiceControls = voiceMode === 'text-to-voice' && (isConnected || isConnecting || hasInitiatedConnection)

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
          shouldShowTextToVoiceControls ? (
            <>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="flex items-center gap-2 rounded-full px-4 py-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                disabled={isConnecting}
              >
                <PhoneOff className="h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'End Voice Session'}
              </Button>
              
              {isConnected && (
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
            <div className="text-xs text-muted-foreground">
              Voice session will start when you send your first message
            </div>
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
                  "flex items-center gap-2 rounded-full px-4 py-2",
                  "bg-green-600 hover:bg-green-700 text-white"
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
                    "rounded-full w-12 h-12 p-0",
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
                  className="rounded-full"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
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