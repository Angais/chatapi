'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/header'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { TypingIndicator } from '@/components/typing-indicator'
import { EmptyState } from '@/components/empty-state'
import { ChatHistory } from '@/components/chat-history'
import { UnsupportedModelDisclaimer } from '@/components/unsupported-model-disclaimer'
import { VoiceChatControls } from '@/components/voice-chat-controls'
import { useChatStore } from '@/stores/chat-store'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const { 
    messages, 
    isLoading, 
    isCurrentChatStreaming,
    getCurrentStreamingMessage,
    error, 
    fetchModels, 
    init,
    isRealtimeModel,
    voiceMode
  } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [dynamicPadding, setDynamicPadding] = useState(0)
  const prevMessagesLengthRef = useRef(messages.length)

  const isStreaming = isCurrentChatStreaming()
  const streamingMessage = getCurrentStreamingMessage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const addSpaceForNewMessage = () => {
    if (!chatContainerRef.current) return

    const container = chatContainerRef.current
    const hasScroll = container.scrollHeight > container.clientHeight
    
    if (hasScroll) {
      // Calcular el espacio más preciso necesario
      const viewportHeight = container.clientHeight
      const currentScrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      
      // Aumentar un poco más el espacio para mejor visibilidad
      const spaceToAdd = Math.min(viewportHeight * 0.7, 500) // Aumentado a 60% y máximo 600px
      setDynamicPadding(prevPadding => prevPadding + spaceToAdd)
    }
  }

  useEffect(() => {
    // Cuando se agrega un nuevo mensaje
    const messagesLengthChanged = messages.length !== prevMessagesLengthRef.current
    const previousLength = prevMessagesLengthRef.current
    prevMessagesLengthRef.current = messages.length
    
    if (messagesLengthChanged && messages.length > 0) {
      // Buscar si hay un mensaje de usuario recién añadido
      const recentUserMessage = messages.find((msg, index) => 
        msg.isUser && index >= previousLength
      )
      
      // SOLO hacer scroll automático para mensajes del USUARIO recién añadidos
      if (recentUserMessage) {
        // Añadir espacio para que quede arriba
        addSpaceForNewMessage()
        
        // Esperar a que se actualice el DOM con el nuevo padding antes de hacer scroll
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom()
          })
        })
      }
      // Para mensajes de IA: NO hacer scroll automático, que aparezcan abajo
    }
  }, [messages])

  // Resetear el padding cuando se inicia una nueva conversación
  useEffect(() => {
    if (messages.length === 0) {
      setDynamicPadding(0)
    }
  }, [messages.length])
  
  // Resetear el padding cuando empieza un streaming nuevo (no durante)
  useEffect(() => {
    if (isStreaming && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Solo resetear si el último mensaje es del usuario (nueva conversación)
      if (lastMessage.isUser) {
        setDynamicPadding(0)
      }
    }
  }, [isStreaming, messages])

  // Fetch models on page load
  useEffect(() => {
    init()
    fetchModels()
  }, [fetchModels, init])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      
      <div className="flex flex-1 relative pt-14">
        {/* Sidebar */}
        <ChatHistory isOpen={isSidebarOpen} />
        
        {/* Main content */}
        <main className={cn(
          "flex-1 flex flex-col transition-all ease-out",
          isSidebarOpen ? "ml-80 duration-100" : "ml-0 duration-0"
        )}>
          {messages.length === 0 && !error && !isStreaming ? (
            /* 🏠 HOME SCREEN - Empty state when no messages */
            <EmptyState />
          ) : (
            /* 💬 CHAT VIEW - Conversation messages */
            <motion.div 
              ref={chatContainerRef}
              className="flex-1 overflow-auto scrollbar-stable"
              style={{ overflowAnchor: 'none' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-auto max-w-3xl px-4 py-2"
                >
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400 select-none">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}

              {/* Messages - including streaming message */}
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1
                const isPlaceholder = message.id.endsWith('_ai')
                const shouldShowStreaming = isLastMessage && !message.isUser && isStreaming && (isPlaceholder || !message.content)
                
                return (
                  <ChatMessage
                    key={message.id}
                    content={shouldShowStreaming && streamingMessage ? streamingMessage : message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    message={message}
                    isStreaming={shouldShowStreaming}
                  />
                )
              })}
              
              {/* Typing indicator - only show if no streaming content yet */}
              {(isLoading || (isStreaming && !streamingMessage)) && <TypingIndicator />}
              
              {/* Dynamic padding to create space for new messages */}
              <div 
                ref={messagesEndRef} 
                style={{ paddingBottom: `${dynamicPadding}px` }}
                className={cn(
                  "transition-all ease-out",
                  isStreaming ? "duration-0" : "duration-300"
                )}
              />
            </motion.div>
          )}
          
          <UnsupportedModelDisclaimer />
          {/* Voice Chat Controls - only show for realtime models with voice mode enabled */}
          <AnimatePresence>
            {isRealtimeModel() && voiceMode !== 'none' && (
              <VoiceChatControls />
            )}
          </AnimatePresence>
          <ChatInput />
        </main>
      </div>
    </div>
  )
}