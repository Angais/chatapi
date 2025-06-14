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
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useChatStore } from '@/stores/chat-store'

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
  
  const { fetchModels, devMode, setDevMode } = useChatStore()

  useEffect(() => {
    // Load API key from localStorage when modal opens
    if (open) {
      const storedKey = localStorage.getItem('openai_api_key') || ''
      setApiKey(storedKey)
    }
  }, [open])

  const handleSave = async () => {
    setIsSaving(true)
    
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
        onOpenChange(false)
        setIsSaving(false)
      }, 500)
    } catch (error) {
      console.error('Error saving settings:', error)
      setIsSaving(false)
    }
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your OpenAI API key and development options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
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
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dev-mode">Developer Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Show technical information about API requests and responses
                </p>
              </div>
              <Switch
                id="dev-mode"
                checked={devMode}
                onCheckedChange={setDevMode}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}