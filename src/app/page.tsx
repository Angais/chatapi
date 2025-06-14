'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/header'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { TypingIndicator } from '@/components/typing-indicator'
import { EmptyState } from '@/components/empty-state'
import { useChatStore } from '@/stores/chat-store'
import { AlertCircle } from 'lucide-react'

export default function ChatPage() {
  const { messages, isLoading, error } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 flex flex-col">
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
            <AnimatePresence mode="wait">
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

              {/* Messages */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  content={message.content}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                />
              ))}
              
              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </AnimatePresence>
          </motion.div>
        )}
        
        <ChatInput />
      </main>
    </div>
  )
}