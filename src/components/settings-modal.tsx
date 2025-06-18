'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, Loader2, Sun, Moon, Monitor, Save } from 'lucide-react'
import { useChatStore, VOICE_OPTIONS } from '@/stores/chat-store'
import { useTheme } from '@/hooks/use-theme'
import { motion } from 'framer-motion'

interface Model {
  id: string
  name: string
  owned_by: string
}

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  
  const { 
    fetchModels, 
    devMode, 
    setDevMode, 
    temperature, 
    setTemperature, 
    maxTokens, 
    setMaxTokens,
    voice,
    setVoice,
    voiceMode,
    isRealtimeModel,
  } = useChatStore()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Load API key from localStorage when modal opens
    if (open) {
      const storedKey = localStorage.getItem('openai_api_key') || ''
      setApiKey(storedKey)
    }
  }, [open])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('saving')
    
    try {
      // Save to localStorage
      if (apiKey.trim()) {
        localStorage.setItem('openai_api_key', apiKey.trim())
      } else {
        localStorage.removeItem('openai_api_key')
      }
      
      // Refetch models if API key changed
      await fetchModels()
      
      // Close modal after short delay
      setTimeout(() => {
        setSaveStatus('saved')
        setTimeout(() => {
          setSaveStatus('idle')
          onOpenChange(false)
        }, 1000)
      }, 500)
    } catch (error) {
      console.error('Error saving settings:', error)
      setIsSaving(false)
      setSaveStatus('idle')
    }
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
  }

  const handleTemperatureChange = (value: string) => {
    const temp = parseFloat(value)
    if (!isNaN(temp) && temp >= 0 && temp <= 2) {
      setTemperature(temp)
    }
  }

  const handleMaxTokensChange = (value: string) => {
    const tokens = parseInt(value)
    if (!isNaN(tokens) && tokens > 0) {
      setMaxTokens(tokens)
    }
  }

  const getThemeIcon = (themeName: string) => {
    const iconClass = "h-4 w-4 mr-2"
    switch (themeName) {
      case 'light':
        return <Sun className={iconClass} />
      case 'dark':
        return <Moon className={iconClass} />
      default:
        return <Monitor className={iconClass} />
    }
  }

  const getThemeLabel = (themeName: string) => {
    switch (themeName) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      default:
        return 'System'
    }
  }

  // Check if we're in voice mode
  const showVoiceSettings = isRealtimeModel() && voiceMode !== 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenAI API settings and chat preferences
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-..."
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          <div className="border-t pt-4" />

          {/* Chat Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Chat Settings</h3>
            
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">Temperature</Label>
                <span className="text-xs text-muted-foreground">{temperature}</span>
              </div>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => handleTemperatureChange(e.target.value)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness: 0 is focused, 2 is more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                min="1"
                max="4096"
                value={maxTokens}
                onChange={(e) => handleMaxTokensChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum length of generated responses
              </p>
            </div>

            {/* Voice Selection - Only show for voice modes */}
            {showVoiceSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="voice">Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger id="voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the voice for audio responses
                </p>
              </motion.div>
            )}
          </div>

          <div className="border-t pt-4" />

          {/* Developer Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dev-mode" className="text-base">Developer Mode</Label>
              <p className="text-xs text-muted-foreground">
                Show technical details about API requests and responses
              </p>
            </div>
            <Switch
              id="dev-mode"
              checked={devMode}
              onCheckedChange={setDevMode}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              disabled={saveStatus !== 'idle'}
            >
              {saveStatus === 'saving' && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Save className="h-4 w-4" />
                  </motion.div>
                  Saving...
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Saved!
                </>
              )}
              {saveStatus === 'idle' && 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}