'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { useVoiceChat } from '@/hooks/use-voice-chat'

export function ChatInput() {
  const [message, setMessage] = useState('')
  const [previousMessage, setPreviousMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const connectionRef = useRef<boolean>(false) // Track connection state
  
  const { 
    sendMessage, 
    isLoading, 
    isCurrentChatStreaming,
    stopStreaming, 
    error,
    currentChatId,
    voiceMode,
    isRealtimeModel
  } = useChatStore()

  const { sendTextMessage, isConnected, connect } = useVoiceChat()

  const isStreaming = isCurrentChatStreaming()

  // Update connection ref when isConnected changes
  useEffect(() => {
    connectionRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Restore previous message if there's an error
  useEffect(() => {
    if (error && previousMessage && !message) {
      setMessage(previousMessage)
      setPreviousMessage('')
    }
  }, [error, previousMessage, message])

  const handleSubmit = async () => {
    if (message.trim() && !isLoading && !isStreaming) {
      const messageToSend = message.trim()
      setPreviousMessage(messageToSend)
      setMessage('')
      
      // Use voice chat for text-to-voice with realtime models
      if (isRealtimeModel() && voiceMode === 'text-to-voice') {
        console.log('Attempting to send via voice chat...', { isConnected: connectionRef.current })
        
        try {
          // If not connected, connect first
          if (!connectionRef.current) {
            console.log('Not connected, establishing connection...')
            await connect()
            console.log('Connection established.')
          }
          
          // Now send the message
          console.log('Sending text message through voice chat')
          sendTextMessage(messageToSend)
          
          // Clear the previous message since it was sent successfully
          setPreviousMessage('')
        } catch (error) {
          console.error('Failed to connect or send message:', error)
          // Restore message on error
          setMessage(messageToSend)
          setPreviousMessage('')
          
          // Show error to user
          useChatStore.getState().setError('Failed to establish voice connection. Please try again.')
          return
        }
      } else {
        // Regular chat for non-realtime models
        await sendMessage(messageToSend)
        setPreviousMessage('')
      }
    }
  }

  const handleStop = () => {
    stopStreaming()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isStreaming || isLoading) {
        handleStop()
      } else {
        handleSubmit()
      }
    }
  }

  const isDisabled = !message.trim() || (isLoading && !isStreaming)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky bottom-0 w-full"
    >
      {/* Main input */}
      <div className="container max-w-4xl mx-auto px-4 pt-4">
        <div className="relative">
          <div className="flex items-end gap-3 p-3 rounded-2xl border border-input bg-background focus-within:border-ring transition-colors">
            {/* Text area */}
            <div className="flex-1 min-h-[24px] max-h-[200px]">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                style={{ 
                  minHeight: '24px', 
                  maxHeight: '200px'
                }}
                rows={1}
                disabled={isLoading && !isStreaming}
              />
            </div>

            {/* Send/Stop button */}
            <Button
              size="icon"
              className={`flex-shrink-0 h-8 w-8 ${isStreaming || isLoading ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              disabled={isDisabled}
              onClick={isStreaming || isLoading ? handleStop : handleSubmit}
            >
              <motion.div
                key={isStreaming || isLoading ? 'stop' : 'send'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {isStreaming || isLoading ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </motion.div>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Opaque bar that rises towards the middle of the input */}
      <div className="w-full bg-background -mt-6 pt-8 pb-6">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Help text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-muted-foreground text-center select-none"
          >
            {isStreaming || isLoading ? (
              "Press Enter or click Stop to cancel"
            ) : (
              "Press Enter to send, Shift + Enter for new line"
            )}
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
} 