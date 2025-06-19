'use client'

import { useState, useEffect } from 'react'
import { useChatStore, VoiceMode } from '@/stores/chat-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import * as SelectPrimitive from '@radix-ui/react-select'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, FileAudio } from 'lucide-react'
import { cn } from '@/lib/utils'

const voiceModeOptions = [
  { value: 'text-to-voice', label: 'Text to Voice', icon: FileAudio },
  { value: 'voice-to-voice', label: 'Voice to Voice', icon: Mic },
]

export function VoiceModeSelector() {
  const {
    voiceMode,
    setVoiceMode,
    isRealtimeModel,
    selectedModel,
  } = useChatStore()

  const isRealtime = isRealtimeModel(selectedModel)
  const [previousMode, setPreviousMode] = useState(voiceMode)
  const [isOpen, setIsOpen] = useState(false)

  // Reset voice mode when switching away from realtime model
  useEffect(() => {
    if (!isRealtime && voiceMode !== 'none') {
      setVoiceMode('none')
    }
  }, [isRealtime, voiceMode, setVoiceMode])

  // Track mode changes for animations
  useEffect(() => {
    if (voiceMode !== previousMode) {
      setPreviousMode(voiceMode)
    }
  }, [voiceMode, previousMode])

  // If switching to realtime model and voice mode is 'none', default to 'text-to-voice'
  useEffect(() => {
    if (isRealtime && voiceMode === 'none') {
      setVoiceMode('text-to-voice')
    }
  }, [isRealtime, voiceMode, setVoiceMode])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    
    // Quitar focus cuando se cierra el selector
    if (!open) {
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

  if (!isRealtime) {
    return null
  }

  const currentOption = voiceModeOptions.find(opt => opt.value === voiceMode) || voiceModeOptions[0]

  return (
    <div>
      <Select
        value={voiceMode === 'none' ? 'text-to-voice' : voiceMode}
        onValueChange={(value) => setVoiceMode(value as VoiceMode)}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        <SelectPrimitive.Trigger
          className={cn(
            'flex h-8 w-auto items-center justify-between rounded-md border px-3 py-2 text-xs gap-2',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            'transition-all duration-200 select-none'
          )}
        >
          <SelectValue />
          <SelectPrimitive.Icon asChild>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-50"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
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
            >
              <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" className="rotate-180 opacity-50">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </SelectPrimitive.ScrollUpButton>
              <SelectPrimitive.Viewport className="p-1">
          <AnimatePresence mode="wait">
            {voiceModeOptions.map((option, index) => {
              const OptionIcon = option.icon
              return (
                <motion.div
                  key={option.value}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.15 }}
                >
                  <SelectItem 
                    value={option.value}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 select-none">
                      <OptionIcon className="h-3.5 w-3.5" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                </motion.div>
              )
            })}
          </AnimatePresence>
              </SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-50">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </motion.div>
        </SelectPrimitive.Portal>
      </Select>
    </div>
  )
}