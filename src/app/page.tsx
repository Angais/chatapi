'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/header'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { TypingIndicator } from '@/components/typing-indicator'
import { EmptyState } from '@/components/empty-state'
import { ChatHistory } from '@/components/chat-history'
import { UnsupportedModelDisclaimer } from '@/components/unsupported-model-disclaimer'
import { useChatStore } from '@/stores/chat-store'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const { messages, isLoading, error, fetchModels, init } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

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
          {messages.length === 0 && !error ? (
            /* 🏠 HOME SCREEN - Empty state when no messages */
            <EmptyState />
          ) : (
            /* 💬 CHAT VIEW - Conversation messages */
            <motion.div 
              className="flex-1 overflow-auto"
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
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}

              {/* Messages - removed AnimatePresence to prevent flickering */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  content={message.content}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                  message={message}
                />
              ))}
              
              {/* Typing indicator */}
              {isLoading && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </motion.div>
          )}
          
          <UnsupportedModelDisclaimer />
          <ChatInput />
        </main>
      </div>
    </div>
  )
}