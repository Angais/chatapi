'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'

export function UnsupportedModelDisclaimer() {
  const { unsupportedModelError, setUnsupportedModelError } = useChatStore()

  if (!unsupportedModelError) return null

  // Determine if it's a temperature adjustment warning or other error
  const isTemperatureWarning = unsupportedModelError.includes('Temperature adjusted')
  const isConfigWarning = isTemperatureWarning || unsupportedModelError.includes('adjusted')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="container max-w-4xl mx-auto px-4 pb-3"
    >
      <div className={`flex items-center justify-between gap-3 rounded-lg p-3 text-sm select-none ${
        isConfigWarning 
          ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
      }`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {isConfigWarning ? 'Configuration Adjusted' : 'Model not supported'}
            </p>
            <p className="text-xs opacity-90 mt-0.5 break-words">
              {unsupportedModelError}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 cursor-pointer ${
            isConfigWarning 
              ? 'hover:bg-blue-100 dark:hover:bg-blue-900/50'
              : 'hover:bg-amber-100 dark:hover:bg-amber-900/50'
          }`}
          onClick={() => setUnsupportedModelError(null)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  )
} 