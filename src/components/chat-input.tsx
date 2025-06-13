'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatInput() {
  const [message, setMessage] = useState('')

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
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                style={{ 
                  minHeight: '24px', 
                  maxHeight: '200px'
                }}
                rows={1}
              />
            </div>

            {/* Send button */}
            <Button
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              disabled={!message.trim()}
            >
              <Send className="h-4 w-4" />
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
            className="text-xs text-muted-foreground text-center"
          >
            Press Enter to send, Shift + Enter for new line
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
} 