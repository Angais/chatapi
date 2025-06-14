'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'

export function UnsupportedModelDisclaimer() {
  const { unsupportedModelError, setUnsupportedModelError } = useChatStore()

  if (!unsupportedModelError) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="container max-w-4xl mx-auto px-4 pb-3"
    >
      <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200 select-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Model not supported</p>
            <p className="text-xs opacity-90 mt-0.5 break-words">
              {unsupportedModelError}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          onClick={() => setUnsupportedModelError(null)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  )
} 