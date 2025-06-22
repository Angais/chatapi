'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { Send, Square, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { useVoiceChat } from '@/hooks/use-voice-chat'

export interface ChatInputRef {
  focus: () => void
  addText: (text: string) => void
}

export const ChatInput = forwardRef<ChatInputRef, Record<string, never>>((_, ref) => {
  ChatInput.displayName = 'ChatInput'
  const [message, setMessage] = useState('')
  const [previousMessage, setPreviousMessage] = useState('')
  const [images, setImages] = useState<Array<{ url: string; file: File }>>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const connectionRef = useRef<boolean>(false) // Track connection state
  
  const { 
    sendMessage, 
    sendImageMessage,
    isLoading, 
    isCurrentChatStreaming,
    stopStreaming, 
    error,
    voiceMode,
    isRealtimeModel,
    isVisionModel,
    isImageModel,
    isVoiceSessionEnded,
    setVoiceSessionEnded,
  } = useChatStore()

  const { sendTextMessage, isConnected, connect } = useVoiceChat()

  const isStreaming = isCurrentChatStreaming()

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    },
    addText: (text: string) => {
      setMessage(prev => prev + text)
      // Focus after adding text
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }), [])

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const url = e.target?.result as string
          setImages(prev => [...prev, { url, file }])
        }
        reader.readAsDataURL(file)
      }
    })

    // Clear the input value to allow selecting the same file again
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // Handle paste events for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    // Check if the model supports vision
    if (!isVisionModel() || isRealtimeModel()) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Check if the item is an image
      if (item.type.startsWith('image/')) {
        e.preventDefault() // Prevent default paste behavior for images
        
        const file = item.getAsFile()
        if (!file) continue

        // Read the file and add it to images
        const reader = new FileReader()
        reader.onload = (event) => {
          const url = event.target?.result as string
          setImages(prev => [...prev, { url, file }])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async () => {
    if ((message.trim() || images.length > 0) && !isLoading && !isStreaming) {
      const messageToSend = message.trim()
      const imagesToSend = [...images]
      setPreviousMessage(messageToSend)
      setMessage('')
      setImages([])
      
      // Check if it's an image generation model
      if (isImageModel() && messageToSend) {
        // Use image generation for image models
        await sendImageMessage(messageToSend)
        setPreviousMessage('')
        return
      }
      
      // Use voice chat for text-to-voice with realtime models
      if (isRealtimeModel() && voiceMode === 'text-to-voice') {
        // If the user manually ended the session, send as a regular message
        if (isVoiceSessionEnded) {
          await sendMessage(messageToSend, imagesToSend)
          setPreviousMessage('')
          return
        }
        
        try {
          // If not connected, connect first
          if (!connectionRef.current) {
            console.log('Not connected, establishing connection...')
            await connect()
            setVoiceSessionEnded(false) // We just connected, so session is active
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
        await sendMessage(messageToSend, imagesToSend)
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

  const isDisabled = !isStreaming && !isLoading && (
    isImageModel() ? !message.trim() : (!message.trim() && images.length === 0)
  )

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
          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.url}
                    alt={`Upload ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3 p-3 rounded-2xl border border-input bg-background focus-within:border-ring transition-colors">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Image upload button - only show for vision models, not image generation models */}
            {isVisionModel() && !isRealtimeModel() && !isImageModel() && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="flex-shrink-0 h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isStreaming}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            )}

            {/* Text area */}
            <div className="flex-1 min-h-[24px] max-h-[200px]">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  isImageModel() 
                    ? "Describe the image you want to generate..." 
                    : images.length > 0 
                      ? "Add a message about the image(s)..." 
                      : "Type a message..."
                }
                className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground placeholder:select-none focus:outline-none"
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
              className={`flex-shrink-0 h-8 w-8 cursor-pointer ${isStreaming || isLoading ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              disabled={isDisabled && images.length === 0}
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
              <>
                Press Enter to send, Shift + Enter for new line
                {isVisionModel() && !isRealtimeModel() && !isImageModel() && " • Paste images with Ctrl/Cmd + V"}
                {isImageModel() && " • Describe the image you want to generate"}
              </>
            )}
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
})