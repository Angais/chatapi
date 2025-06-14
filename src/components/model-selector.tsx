'use client'

import { useChatStore } from '@/stores/chat-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function ModelSelector() {
  const {
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
  } = useChatStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.2 }}
    >
      <Select
        value={selectedModel}
        onValueChange={setSelectedModel}
        disabled={isLoadingModels}
      >
        <SelectTrigger className="w-auto h-8 text-xs gap-2 border-dashed focus:border-solid">
          {isLoadingModels ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a model" />
          )}
        </SelectTrigger>
        <SelectContent position="popper">
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  )
} 