'use client'

import { useState, useEffect, useRef } from 'react'
import { useChatStore, REALTIME_MODELS, VISION_MODELS, IMAGE_MODELS } from '@/stores/chat-store'
import {
  Select,
  SelectItem,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import * as SelectPrimitive from '@radix-ui/react-select'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronDown, ChevronRight, Mic, AlertCircle, Image } from 'lucide-react'
import { ReasoningEffortSelector } from './reasoning-effort-selector'
import { ImageQualitySelector } from './image-quality-selector'
import { ImageStreamingSelector } from './image-streaming-selector'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Custom SelectTrigger that only shows chevron when there are other models
const CustomSelectTrigger = ({ className, children, showChevron, ...props }: { 
  className?: string, 
  children: React.ReactNode, 
  showChevron?: boolean 
} & React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      'flex h-8 w-auto items-center justify-between rounded-md border px-3 py-2 text-xs gap-2 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 transition-all duration-200 select-none cursor-pointer',
      className
    )}
    {...props}
    onMouseDown={(e) => {
      if (e.detail > 1) {
        e.preventDefault()
      }
    }}
  >
    {children}
    {showChevron && (
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </SelectPrimitive.Icon>
    )}
  </SelectPrimitive.Trigger>
)

// Animated model name component with mobile truncation
const AnimatedModelName = ({ modelName, isLoading }: { modelName: string, isLoading: boolean }) => {
  const [displayName, setDisplayName] = useState(modelName)
  const [isChanging, setIsChanging] = useState(false)

  useEffect(() => {
    if (modelName !== displayName && !isLoading) {
      setIsChanging(true)
      // Delay to show the fade animation
      setTimeout(() => {
        setDisplayName(modelName)
        setIsChanging(false)
      }, 100)
    } else if (!isLoading) {
      setDisplayName(modelName)
    }
  }, [modelName, isLoading, displayName])

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </motion.div>
    )
  }

  // Truncate long model names on mobile
  const getTruncatedName = (name: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) { // sm breakpoint
      if (name.length > 12) {
        return name.substring(0, 12) + '...'
      }
    }
    return name
  }

  return (
    <motion.span
      key={displayName}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: isChanging ? 0.3 : 1, x: 0 }}
      transition={{ 
        duration: 0.15, 
        ease: "easeInOut",
        opacity: { duration: isChanging ? 0.1 : 0.15 }
      }}
      className="truncate max-w-[8rem] sm:max-w-none select-none"
      title={displayName} // Show full name on hover
    >
      {getTruncatedName(displayName)}
    </motion.span>
  )
}

// Custom SelectItem with disabled state support
const DisableableSelectItem = ({ 
  value, 
  children, 
  disabled = false, 
  tooltipContent = "",
  className = "",
  ...props 
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
  tooltipContent?: string
  className?: string
}) => {
  const itemContent = (
    <SelectItem 
      value={value} 
      disabled={disabled}
      className={cn(
        disabled && "opacity-50 cursor-not-allowed text-muted-foreground",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {disabled && <AlertCircle className="h-3 w-3" />}
      </div>
    </SelectItem>
  )

  if (disabled && tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {itemContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return itemContent
}

export function ModelSelector() {
  const {
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    getAvailablePresets,
    getOtherModels,
    setVoiceMode,
    chatHasImages,
  } = useChatStore()

  const [showAllModels, setShowAllModels] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [previousModel, setPreviousModel] = useState(selectedModel)
  const [shouldAnimatePresets, setShouldAnimatePresets] = useState(true)
  const selectedItemRef = useRef<HTMLDivElement>(null)
  const availablePresets = getAvailablePresets()
  const otherModels = getOtherModels()
  
  // Check if current chat has images
  const hasImages = chatHasImages()
  
  // Check if model can be selected based on chat state
  const isModelDisabled = (modelId: string) => {
    // If chat has images, only vision models can be selected (not realtime)
    if (hasImages) {
      const isVision = VISION_MODELS.some(vm => modelId.includes(vm))
      const isRealtime = REALTIME_MODELS.some(rm => rm.id === modelId)
      // Disable if it's realtime OR if it's not a vision model
      return isRealtime || !isVision
    }
    
    return false
  }
  
  // Get tooltip message for disabled models
  const getDisabledTooltip = (modelId: string) => {
    const isRealtime = REALTIME_MODELS.some(rm => rm.id === modelId)
    const isVision = VISION_MODELS.some(vm => modelId.includes(vm))
    
    if (hasImages) {
      if (isRealtime) {
        return "Realtime models don't support images"
      } else if (!isVision) {
        return "This model doesn't support images"
      }
    }
    
    return ""
  }

  // Solo mostrar la flecha si hay otros modelos disponibles
  const shouldShowChevron = otherModels.length > 0 && availablePresets.length > 0

  // Encontrar el nombre a mostrar para el modelo seleccionado
  const getDisplayName = (modelId: string) => {
    const preset = availablePresets.find(p => p.id === modelId)
    if (preset) return preset.displayName
    
    const realtimeModel = REALTIME_MODELS.find(rm => rm.id === modelId)
    if (realtimeModel) return realtimeModel.displayName
    
    // Check if it's an image generation model
    if (IMAGE_MODELS.includes(modelId)) {
      return modelId === 'gpt-4o' ? 'GPT-4o (Images)' : modelId
    }
    
    return modelId
  }

  // Check if selected model is in other models (not in presets or realtime)
  const isSelectedModelInOtherModels = () => {
    const isInPresets = availablePresets.some(preset => preset.id === selectedModel)
    const isInRealtime = REALTIME_MODELS.some(rm => rm.id === selectedModel)
    const isInOtherModels = otherModels.some(model => model.id === selectedModel)
    return !isInPresets && !isInRealtime && isInOtherModels
  }

  // Track model changes for animations
  useEffect(() => {
    if (selectedModel !== previousModel) {
      setPreviousModel(selectedModel)
    }
  }, [selectedModel, previousModel])

  // Auto-expand "show all models" if selected model is in other models
  useEffect(() => {
    if (isOpen && isSelectedModelInOtherModels()) {
      setShowAllModels(true)
      setShouldAnimatePresets(false) // Don't animate presets when auto-expanding
    }
  }, [isOpen, selectedModel, availablePresets, otherModels])

  // Scroll to selected item when dropdown opens
  useEffect(() => {
    if (isOpen && selectedItemRef.current) {
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        })
      }, 100)
    }
  }, [isOpen, showAllModels])

  // Resetear el estado de showAllModels cuando se abre el dropdown
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    
    // Quitar focus cuando se cierra el selector
    if (!open) {
      // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
      requestAnimationFrame(() => {
        // Buscar el trigger específico del selector que se acaba de cerrar
        const activeElement = document.activeElement as HTMLElement
        if (activeElement) {
          // Si es un elemento relacionado con select, hacer blur
          if (activeElement.hasAttribute('data-radix-select-trigger') || 
              activeElement.getAttribute('role') === 'combobox' ||
              activeElement.hasAttribute('aria-haspopup')) {
            activeElement.blur()
          }
        }
        
        // También buscar elementos que puedan haber quedado focused
        const focusedSelects = document.querySelectorAll('[data-radix-select-trigger]:focus, [role="combobox"]:focus')
        focusedSelects.forEach(el => {
          if (el instanceof HTMLElement) {
            el.blur()
          }
        })
      })
    }
  }

  const handleShowAllModelsToggle = () => {
    // Cuando se expande/colapsa "show all models", no animar presets
    setShouldAnimatePresets(false)
    setShowAllModels(!showAllModels)
  }

  const handleModelChange = (value: string) => {
    const previousModel = selectedModel
    const wasRealtimeModel = REALTIME_MODELS.some(m => m.id === previousModel)
    const isNewRealtimeModel = REALTIME_MODELS.some(m => m.id === value)
    
    // Animate the change
    setSelectedModel(value)
    
    // If switching to a realtime model, set default voice mode to text-to-voice
    if (isNewRealtimeModel) {
      // Only change voice mode if we're switching from a non-realtime model
      if (!wasRealtimeModel) {
        setVoiceMode('text-to-voice')
      }
      // If switching between realtime models, keep the current voice mode
    } else {
      // Reset to none when switching away from realtime
      setVoiceMode('none')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div>
        <Select
          value={selectedModel}
          onValueChange={handleModelChange}
          disabled={isLoadingModels}
          open={isOpen}
          onOpenChange={handleOpenChange}
        >
          <CustomSelectTrigger showChevron={shouldShowChevron}>
            <SelectValue placeholder="Select a model">
              <AnimatedModelName 
                modelName={getDisplayName(selectedModel)} 
                isLoading={isLoadingModels}
              />
            </SelectValue>
          </CustomSelectTrigger>
          <SelectPrimitive.Portal>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 400,
                duration: 0.1
              }}
            >
              <SelectPrimitive.Content
                className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md w-64 max-h-80"
                position="popper"
                sideOffset={4}
                onCloseAutoFocus={(e) => {
                  e.preventDefault()
                }}
              >
                <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
                  <ChevronDown className="h-4 w-4 rotate-180" />
                </SelectPrimitive.ScrollUpButton>
                <SelectPrimitive.Viewport className="p-1">
            {/* Presets disponibles */}
            {availablePresets.map((preset, index) => {
              const disabled = isModelDisabled(preset.id)
              const tooltipContent = getDisabledTooltip(preset.id)
              
              return (
                <motion.div
                  key={preset.id}
                  ref={preset.id === selectedModel ? selectedItemRef : null}
                  initial={shouldAnimatePresets ? { opacity: 0, x: -10 } : false}
                  animate={shouldAnimatePresets ? { opacity: 1, x: 0 } : false}
                  transition={shouldAnimatePresets ? { delay: index * 0.02, duration: 0.15 } : {}}
                >
                  <DisableableSelectItem
                    value={preset.id}
                    disabled={disabled}
                    tooltipContent={tooltipContent}
                  >
                    <motion.span
                      className="select-none"
                      whileHover={!disabled ? { x: 2 } : {}}
                      transition={{ duration: 0.1 }}
                    >
                      {preset.displayName}
                    </motion.span>
                  </DisableableSelectItem>
                </motion.div>
              )
            })}
            
            {/* Realtime models */}
            {REALTIME_MODELS.length > 0 && availablePresets.length > 0 && (
              <SelectSeparator />
            )}
            
            {REALTIME_MODELS.map((model, index) => {
              const disabled = isModelDisabled(model.id)
              const tooltipContent = getDisabledTooltip(model.id)
              
              return (
                <motion.div
                  key={model.id}
                  ref={model.id === selectedModel ? selectedItemRef : null}
                  initial={shouldAnimatePresets ? { opacity: 0, x: -10 } : false}
                  animate={shouldAnimatePresets ? { opacity: 1, x: 0 } : false}
                  transition={shouldAnimatePresets ? { delay: (availablePresets.length + index) * 0.02, duration: 0.15 } : {}}
                >
                  <DisableableSelectItem
                    value={model.id}
                    disabled={disabled}
                    tooltipContent={tooltipContent}
                  >
                    <motion.div
                      className="flex items-center gap-2 select-none"
                      whileHover={!disabled ? { x: 2 } : {}}
                      transition={{ duration: 0.1 }}
                    >
                      <Mic className="h-3 w-3" />
                      <span>{model.displayName}</span>
                    </motion.div>
                  </DisableableSelectItem>
                </motion.div>
              )
            })}
            
            {/* Image generation models */}
            {IMAGE_MODELS.length > 0 && (availablePresets.length > 0 || REALTIME_MODELS.length > 0) && (
              <SelectSeparator />
            )}
            
            {IMAGE_MODELS.map((modelId, index) => {
              const displayName = modelId === 'gpt-4o' ? 'GPT-4o (Images)' : modelId
              const disabled = isModelDisabled(modelId)
              const tooltipContent = getDisabledTooltip(modelId)
              
              return (
                <motion.div
                  key={modelId}
                  ref={modelId === selectedModel ? selectedItemRef : null}
                  initial={shouldAnimatePresets ? { opacity: 0, x: -10 } : false}
                  animate={shouldAnimatePresets ? { opacity: 1, x: 0 } : false}
                  transition={shouldAnimatePresets ? { delay: (availablePresets.length + REALTIME_MODELS.length + index) * 0.02, duration: 0.15 } : {}}
                >
                  <DisableableSelectItem
                    value={modelId}
                    disabled={disabled}
                    tooltipContent={tooltipContent}
                  >
                    <motion.div
                      className="flex items-center gap-2 select-none"
                      whileHover={!disabled ? { x: 2 } : {}}
                      transition={{ duration: 0.1 }}
                    >
                      <Image className="h-3 w-3" />
                      <span>{displayName}</span>
                    </motion.div>
                  </DisableableSelectItem>
                </motion.div>
              )
            })}
            
            {/* Separador y desplegable de otros modelos */}
            {otherModels.length > 0 && (availablePresets.length > 0 || REALTIME_MODELS.length > 0 || IMAGE_MODELS.length > 0) && (
              <SelectSeparator />
            )}
            
            {otherModels.length > 0 && (
                            <>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 cursor-pointer rounded-sm transition-colors select-none"
                  onClick={handleShowAllModelsToggle}
                >
                  <ChevronRight className="h-3 w-3" />
                  {showAllModels ? 'Hide all models' : 'Show all models'}
                </div>
                
                <AnimatePresence>
                  {showAllModels && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <motion.div 
                        className="px-3 py-2 text-xs text-muted-foreground/70 italic border-b border-border/50 mb-1 select-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        These are all models available from the API. Many may not work with our interface, but we provide the freedom to try them.
                      </motion.div>
                      
                      {otherModels.map((model, index) => {
                        const disabled = isModelDisabled(model.id)
                        const tooltipContent = getDisabledTooltip(model.id)
                        
                        return (
                          <motion.div
                            key={model.id}
                            ref={model.id === selectedModel ? selectedItemRef : null}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                              delay: 0.15 + (index * 0.01), 
                              duration: 0.15 
                            }}
                          >
                            <DisableableSelectItem
                              value={model.id}
                              disabled={disabled}
                              tooltipContent={tooltipContent}
                              className="pl-6"
                            >
                              <motion.span
                                className="select-none"
                                whileHover={!disabled ? { x: 2 } : {}}
                                transition={{ duration: 0.1 }}
                              >
                                {model.name}
                              </motion.span>
                            </DisableableSelectItem>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
                </SelectPrimitive.Viewport>
                <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
                  <ChevronDown className="h-4 w-4" />
                </SelectPrimitive.ScrollDownButton>
              </SelectPrimitive.Content>
            </motion.div>
          </SelectPrimitive.Portal>
        </Select>
      </div>
      
      <ReasoningEffortSelector />
      <ImageQualitySelector />
      <ImageStreamingSelector />
    </div>
  )
} 