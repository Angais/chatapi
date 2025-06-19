'use client'

import { useState, useEffect } from 'react'
import { useChatStore, ReasoningEffort, REASONING_MODELS } from '@/stores/chat-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import * as SelectPrimitive from '@radix-ui/react-select'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Custom SelectTrigger identical to model selector
const CustomSelectTrigger = ({ className, children, ...props }: { 
  className?: string, 
  children: React.ReactNode
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
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3 w-3 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
)

// Animated reasoning effort name component
const AnimatedEffortName = ({ effortName }: { effortName: string }) => {
  const [displayName, setDisplayName] = useState(effortName)
  const [isChanging, setIsChanging] = useState(false)

  useEffect(() => {
    if (effortName !== displayName) {
      setIsChanging(true)
      // Delay to show the fade animation
      setTimeout(() => {
        setDisplayName(effortName)
        setIsChanging(false)
      }, 100)
    } else {
      setDisplayName(effortName)
    }
  }, [effortName, displayName])

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
      className="truncate select-none"
    >
      {displayName}
    </motion.span>
  )
}

export function ReasoningEffortSelector() {
  const {
    reasoningEffort,
    setReasoningEffort,
    selectedModel,
    getOtherModels,
  } = useChatStore()

  const [isOpen, setIsOpen] = useState(false)
  const [shouldAnimateOptions, setShouldAnimateOptions] = useState(true)
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Las opciones deben animarse al abrir el dropdown
      setShouldAnimateOptions(true)
    } else {
      // Reset animation state when closing
      setShouldAnimateOptions(true)
      
      // Quitar focus cuando se cierra el selector
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

  const handleEffortChange = (value: ReasoningEffort) => {
    setReasoningEffort(value)
  }

  return (
    <div>
      <Select
        value={reasoningEffort}
        onValueChange={handleEffortChange}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        <CustomSelectTrigger>
          <SelectValue>
            <AnimatedEffortName 
              effortName={options.find(opt => opt.value === reasoningEffort)?.label || 'Medium'}
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
              className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md w-44"
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
          {/* Disclaimer para modelos "otros" */}
          {isOtherModel && (
            <>
              <motion.div 
                className="px-3 py-2 text-xs text-muted-foreground/70 italic border-b border-border/50 mb-1 select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                This model may not support reasoning. If unsupported, reasoning will be automatically disabled.
              </motion.div>
              <SelectSeparator />
            </>
          )}
          
          {options.map((option, index) => (
            <motion.div
              key={option.value}
              initial={shouldAnimateOptions ? { opacity: 0, x: -10 } : false}
              animate={shouldAnimateOptions ? { opacity: 1, x: 0 } : false}
              transition={shouldAnimateOptions ? { delay: index * 0.03, duration: 0.15 } : {}}
            >
              <SelectItem value={option.value}>
                <motion.span
                  className="select-none"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                >
                  {option.label}
                </motion.span>
              </SelectItem>
            </motion.div>
          ))}
              </SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
                <ChevronDown className="h-4 w-4" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </motion.div>
        </SelectPrimitive.Portal>
      </Select>
    </div>
  )
} 