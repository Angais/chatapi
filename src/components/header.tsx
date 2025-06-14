'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, Settings, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { SettingsModal } from '@/components/settings-modal'
import { useChatStore } from '@/stores/chat-store'

export function Header() {
  const { theme, setTheme, actualTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { clearMessages } = useChatStore()

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="w-full flex h-14 items-center justify-between px-4">
        {/* Lado izquierdo - Nombre + Nuevo chat */}
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">Chatapi</h1>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Lado derecho - Acciones */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center space-x-1"
        >
          <Button
            variant="ghost"
            size="icon"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="relative"
          >
            {getThemeIcon()}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
      
      <SettingsModal 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </motion.header>
  )
} 