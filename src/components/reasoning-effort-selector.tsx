'use client'

import { useChatStore, ReasoningEffort, REASONING_MODELS } from '@/stores/chat-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import { motion } from 'framer-motion'

export function ReasoningEffortSelector() {
  const {
    reasoningEffort,
    setReasoningEffort,
    selectedModel,
    getOtherModels,
  } = useChatStore()

  const otherModels = getOtherModels()
  const isOtherModel = otherModels.some(model => model.id === selectedModel)
  const isReasoningModel = REASONING_MODELS.includes(selectedModel)

  // Si no es un modelo que requiere reasoning effort, no mostrar nada
  if (!isReasoningModel && !isOtherModel) {
    return null
  }

  // Opciones disponibles según el tipo de modelo
  const getOptions = () => {
    const baseOptions = [
      { value: 'low' as ReasoningEffort, label: 'Low' },
      { value: 'medium' as ReasoningEffort, label: 'Medium' },
      { value: 'high' as ReasoningEffort, label: 'High' },
    ]

    // Para modelos "otros", añadir la opción "no reasoning"
    if (isOtherModel) {
      return [
        { value: 'no-reasoning' as ReasoningEffort, label: 'No reasoning' },
        ...baseOptions,
      ]
    }

    return baseOptions
  }

  const options = getOptions()

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15, duration: 0.2 }}
    >
      <Select
        value={reasoningEffort}
        onValueChange={(value: ReasoningEffort) => setReasoningEffort(value)}
      >
        <SelectTrigger className="w-auto h-8 text-xs gap-2 border-dashed focus:border-solid">
          <SelectValue>
            {options.find(opt => opt.value === reasoningEffort)?.label || 'Medium'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="w-44">
          {/* Disclaimer para modelos "otros" */}
          {isOtherModel && (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground/70 italic border-b border-border/50 mb-1">
                This model may not support reasoning. If unsupported, reasoning will be automatically disabled.
              </div>
              <SelectSeparator />
            </>
          )}
          
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  )
} 