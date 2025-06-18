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
import { Mic, MicOff, FileAudio } from 'lucide-react'
import { cn } from '@/lib/utils'

const voiceModeOptions = [
  { value: 'none', label: 'Text Only', icon: MicOff },
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

  if (!isRealtime) {
    return null
  }

  const currentOption = voiceModeOptions.find(opt => opt.value === voiceMode) || voiceModeOptions[0]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Select
        value={voiceMode}
        onValueChange={(value) => setVoiceMode(value as VoiceMode)}
      >
        <SelectPrimitive.Trigger
          className={cn(
            'flex h-8 w-auto items-center justify-between rounded-md border px-3 py-2 text-xs gap-2',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            'transition-all duration-200'
          )}
        >
          <SelectValue />
          <SelectPrimitive.Icon asChild>
            <motion.svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-50"
              animate={{ rotate: 0 }}
              transition={{ duration: 0.2 }}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectContent position="popper" className="w-48">
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
                    <div className="flex items-center gap-2">
                      <OptionIcon className="h-3.5 w-3.5" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </SelectContent>
      </Select>
    </motion.div>
  )
}