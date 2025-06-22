'use client'

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp } from 'lucide-react'
import { useChatStore } from '@/stores/chat-store'
import { useEffect, useState } from 'react'

export function ChatCostDisplay() {
  const { getChatCost, currentChatId, isCurrentChatStreaming, messages, devMode } = useChatStore()
  const [currentCost, setCurrentCost] = useState(0)
  const [previousCost, setPreviousCost] = useState(0)
  const isStreaming = isCurrentChatStreaming()

  useEffect(() => {
    const cost = getChatCost()
    console.log('ChatCostDisplay Debug:', {
      cost,
      currentChatId,
      devMode,
      messagesCount: messages.length,
      messagesWithUsage: messages.filter(m => m.debugInfo?.receivedFromAPI?.usage).length,
      lastMessage: messages[messages.length - 1]?.debugInfo
    })
    
    if (cost !== currentCost) {
      setPreviousCost(currentCost)
      setCurrentCost(cost)
    }
  }, [getChatCost, currentChatId, isStreaming, messages, devMode])

  // Show debug info when dev mode is on
  if (devMode && currentChatId) {
    console.log('Debug: currentCost =', currentCost, 'messages with usage:', 
      messages.filter(m => m.debugInfo?.receivedFromAPI?.usage).length)
  }

  // Always show something in dev mode for debugging
  if (devMode && currentChatId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="container max-w-4xl mx-auto px-4 pb-2"
      >
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span className="font-mono">
            Current chat cost: ${currentCost.toFixed(4)}
            {currentCost === 0 && ' (waiting for usage data...)'}
          </span>
        </div>
      </motion.div>
    )
  }

  // Don't show if no cost or no current chat
  if (currentCost === 0 || !currentChatId) {
    return null
  }

  const costIncrease = currentCost - previousCost

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="container max-w-4xl mx-auto px-4 pb-2"
    >
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <DollarSign className="h-3 w-3" />
        <span className="font-mono">
          Current chat cost: ${currentCost.toFixed(4)}
        </span>
        {costIncrease > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-green-600 dark:text-green-400"
          >
            <TrendingUp className="h-3 w-3" />
            <span className="font-mono">+${costIncrease.toFixed(4)}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
} 