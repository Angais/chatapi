'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/settings-modal'
import { useChatStore } from '@/stores/chat-store'
import { ModelSelector } from './model-selector'
import { VoiceModeSelector } from './voice-mode-selector'

interface HeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { createNewChat } = useChatStore()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="w-full flex h-14 items-center justify-between px-4">
        {/* Lado izquierdo - Menu + Nuevo chat + Selectores */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            title="Toggle sidebar"
            className="cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={createNewChat}
            title="New chat"
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <ModelSelector />
          <VoiceModeSelector />
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
            className="cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer"
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