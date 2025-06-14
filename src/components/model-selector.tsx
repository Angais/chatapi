'use client'

import { useState } from 'react'
import { useChatStore } from '@/stores/chat-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import { motion } from 'framer-motion'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'

export function ModelSelector() {
  const {
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    getAvailablePresets,
    getOtherModels,
  } = useChatStore()

  const [showAllModels, setShowAllModels] = useState(false)
  const availablePresets = getAvailablePresets()
  const otherModels = getOtherModels()

  // Encontrar el nombre a mostrar para el modelo seleccionado
  const getDisplayName = (modelId: string) => {
    const preset = availablePresets.find(p => p.id === modelId)
    if (preset) return preset.displayName
    return modelId
  }

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
            <SelectValue placeholder="Select a model">
              {getDisplayName(selectedModel)}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent 
          position="popper" 
          className="w-64"
        >
          {/* Presets disponibles */}
          {availablePresets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.displayName}
            </SelectItem>
          ))}
          
          {/* Separador y desplegable de otros modelos */}
          {otherModels.length > 0 && availablePresets.length > 0 && (
            <SelectSeparator />
          )}
          
          {otherModels.length > 0 && (
            <>
              <div
                className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 cursor-pointer rounded-sm"
                onClick={() => setShowAllModels(!showAllModels)}
              >
                {showAllModels ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Show all models
              </div>
              
              {showAllModels && (
                <>
                  <div className="px-3 py-2 text-xs text-muted-foreground/70 italic border-b border-border/50 mb-1">
                    These are all models available from the API. Many may not work with our interface, but we provide the freedom to try them.
                  </div>
                  
                  {otherModels.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="pl-6">
                      {model.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </>
          )}
        </SelectContent>
      </Select>
    </motion.div>
  )
} 