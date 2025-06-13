'use client'

import { motion } from 'framer-motion'
import { Search, Plus, Settings, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

export function Header() {
  const { theme, setTheme, actualTheme } = useTheme()

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
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Lado izquierdo - Nuevo chat + Logo */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <h1 className="text-lg font-semibold">ChatAPI</h1>
          </div>
        </div>

        {/* Centro - vacío para centrar el contenido */}
        <div className="flex-1"></div>

        {/* Lado derecho - Acciones */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center space-x-2"
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
          >
            <Settings className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </motion.header>
  )
} 