'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChatHistoryProps {
  isOpen: boolean
}

export function ChatHistory({ isOpen }: ChatHistoryProps) {
  const { chats, currentChatId, loadChat, deleteChat, updateChatTitle, getStreamingChats } = useChatStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const streamingChats = getStreamingChats()

  const handleEdit = (chatId: string, currentTitle: string) => {
    setEditingId(chatId)
    setEditingTitle(currentTitle)
  }

  const handleSaveEdit = (chatId: string) => {
    if (editingTitle.trim()) {
      updateChatTitle(chatId, editingTitle.trim())
    }
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'long' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: -320 }}
          animate={{ x: 0 }}
          exit={{ x: -320 }}
          transition={{ 
            duration: 0.25,
            ease: [0.25, 0.1, 0.25, 1]
          }}
          className="fixed left-0 top-14 bottom-0 w-80 bg-background border-r border-border z-40 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Chat History</h2>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No chat history yet. Start a new conversation!
              </div>
            ) : (
              <div className="p-2">
                {chats.map((chat) => {
                  const isStreaming = streamingChats.includes(chat.id)
                  
                  return (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "group relative mb-1 rounded-lg transition-colors",
                        currentChatId === chat.id ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      {editingId === chat.id ? (
                        <div className="flex items-center gap-1 p-2">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(chat.id)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 cursor-pointer"
                            onClick={() => handleSaveEdit(chat.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 cursor-pointer"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => loadChat(chat.id)}
                          className="w-full text-left p-3 pr-20 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              {isStreaming && (
                                <motion.div
                                  className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {chat.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(chat.updatedAt)}
                                {isStreaming && (
                                  <span className="ml-2 text-green-600 dark:text-green-400">
                                    • Streaming
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Actions */}
                      {editingId !== chat.id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(chat.id, chat.title)
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 hover:text-destructive cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteChat(chat.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
} 