'use client'

import { useState, useEffect } from 'react'
import { useChatStore, ImageAspectRatio, ASPECT_RATIOS } from '@/stores/chat-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import * as SelectPrimitive from '@radix-ui/react-select'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Custom SelectTrigger identical to other selectors
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

// Animated aspect ratio name component
const AnimatedAspectRatioName = ({ aspectRatioName }: { aspectRatioName: string }) => {
  const [displayName, setDisplayName] = useState(aspectRatioName)
  const [isChanging, setIsChanging] = useState(false)

  useEffect(() => {
    if (aspectRatioName !== displayName) {
      setIsChanging(true)
      // Delay to show the fade animation
      setTimeout(() => {
        setDisplayName(aspectRatioName)
        setIsChanging(false)
      }, 100)
    } else {
      setDisplayName(aspectRatioName)
    }
  }, [aspectRatioName, displayName])

  return (
    <motion.div
      key={displayName}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: isChanging ? 0.3 : 1, x: 0 }}
      transition={{ 
        duration: 0.15, 
        ease: "easeInOut",
        opacity: { duration: isChanging ? 0.1 : 0.15 }
      }}
      className="flex items-center gap-2 truncate select-none"
    >
      <Maximize2 className="h-3 w-3" />
      <span>{displayName}</span>
    </motion.div>
  )
}

export function ImageAspectRatioSelector() {
  const {
    imageAspectRatio,
    setImageAspectRatio,
    selectedModel,
    isImageModel,
  } = useChatStore()

  const [isOpen, setIsOpen] = useState(false)
  const [shouldAnimateOptions, setShouldAnimateOptions] = useState(true)
  
  // Only show if current model is an image generation model
  if (!isImageModel(selectedModel)) {
    return null
  }

  const currentRatio = ASPECT_RATIOS.find(ratio => ratio.id === imageAspectRatio) || ASPECT_RATIOS[0]

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Options should animate when opening dropdown
      setShouldAnimateOptions(true)
    } else {
      // Reset animation state when closing
      setShouldAnimateOptions(true)
      
      // Remove focus when closing selector
      requestAnimationFrame(() => {
        // Find the specific trigger of the selector that just closed
        const activeElement = document.activeElement as HTMLElement
        if (activeElement) {
          // If it's a select-related element, blur it
          if (activeElement.hasAttribute('data-radix-select-trigger') || 
              activeElement.getAttribute('role') === 'combobox' ||
              activeElement.hasAttribute('aria-haspopup')) {
            activeElement.blur()
          }
        }
        
        // Also look for any remaining focused selects
        const focusedSelects = document.querySelectorAll('[data-radix-select-trigger]:focus, [role="combobox"]:focus')
        focusedSelects.forEach(el => {
          if (el instanceof HTMLElement) {
            el.blur()
          }
        })
      })
    }
  }

  const handleAspectRatioChange = (value: ImageAspectRatio) => {
    setImageAspectRatio(value)
  }

  return (
    <div>
      <Select
        value={imageAspectRatio}
        onValueChange={handleAspectRatioChange}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        <CustomSelectTrigger>
          <SelectValue>
            <AnimatedAspectRatioName 
              aspectRatioName={currentRatio.name}
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
              className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md w-48"
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
                {/* Aspect ratio disclaimer */}
                <motion.div 
                  className="px-3 py-2 text-xs text-muted-foreground/70 italic border-b border-border/50 mb-1 select-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Image aspect ratio
                </motion.div>

                {/* Aspect ratio options */}
                <AnimatePresence>
                  {shouldAnimateOptions && ASPECT_RATIOS.map((ratio, index) => (
                    <motion.div
                      key={ratio.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: 0.05 + index * 0.02,
                        duration: 0.15
                      }}
                    >
                      <SelectItem 
                        value={ratio.id}
                        className="text-xs cursor-pointer hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{ratio.name}</span>
                          <span className="text-muted-foreground ml-2">{ratio.size}</span>
                        </div>
                      </SelectItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
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