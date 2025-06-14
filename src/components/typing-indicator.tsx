'use client'

import { motion } from 'framer-motion'
import { useChatStore } from '@/stores/chat-store'

export function TypingIndicator() {
  const { isReasoningModel, selectedModel, getOtherModels } = useChatStore()
  const otherModels = getOtherModels()
  
  // Determine if the current model is a reasoning model or in "all models"
  const isReasoning = isReasoningModel(selectedModel)
  const isInAllModels = otherModels.some(model => model.id === selectedModel)
  
  // For non-reasoning models that are not in "all models", don't show the indicator
  if (!isReasoning && !isInAllModels) {
    return null
  }

  const displayText = isReasoning || isInAllModels ? 'Thinking' : 'typing'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full py-4"
    >
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex justify-start">
          <div className="max-w-[75%] flex flex-col items-start">
            <div className="px-4 py-3 rounded-2xl bg-transparent">
              <div className="flex items-center gap-1 select-none">
                <span className="text-sm text-muted-foreground">{displayText}</span>
                <div className="flex gap-1 ml-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.4, 1, 0.4]
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 