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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

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
  const [selectedModel, setSelectedModel] = useState('')
  const [models, setModels] = useState<Model[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState('')

  useEffect(() => {
    // Load API key and model from localStorage when modal opens
    if (open) {
      const storedKey = localStorage.getItem('openai_api_key') || ''
      const storedModel = localStorage.getItem('openai_model') || 'gpt-4o-mini'
      setApiKey(storedKey)
      setSelectedModel(storedModel)
      
      // Fetch models if API key exists
      if (storedKey) {
        fetchModels(storedKey)
      }
    }
  }, [open])

  const fetchModels = async (key: string) => {
    setIsLoadingModels(true)
    setModelsError('')
    
    try {
      const response = await fetch('/api/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch models')
      }

      setModels(data.models)
    } catch (error) {
      const errorObj = error as any
      setModelsError(errorObj?.message || 'Failed to fetch models')
      // Set some default models if fetch fails
      setModels([
        { id: 'gpt-4o-mini', name: 'gpt-4o-mini', owned_by: 'openai' },
        { id: 'gpt-4o', name: 'gpt-4o', owned_by: 'openai' },
        { id: 'gpt-4-turbo', name: 'gpt-4-turbo', owned_by: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', owned_by: 'openai' },
      ])
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Save to localStorage
      if (apiKey.trim()) {
        localStorage.setItem('openai_api_key', apiKey.trim())
      } else {
        localStorage.removeItem('openai_api_key')
      }
      
      if (selectedModel) {
        localStorage.setItem('openai_model', selectedModel)
      }
      
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
    // Clear models when API key changes
    if (!value.trim()) {
      setModels([])
      setModelsError('')
    }
  }

  const handleLoadModels = () => {
    if (apiKey.trim()) {
      fetchModels(apiKey.trim())
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your API settings and preferences.
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
              <Label htmlFor="model">Model</Label>
              {apiKey && !models.length && !isLoadingModels && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadModels}
                  className="h-8 text-xs"
                >
                  Load Models
                </Button>
              )}
            </div>
            
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={!models.length || isLoadingModels}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    isLoadingModels 
                      ? "Loading models..." 
                      : models.length 
                        ? "Select a model" 
                        : "Enter API key to load models"
                  }
                />
              </SelectTrigger>
              <SelectContent position="item-aligned">
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        by {model.owned_by}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLoadingModels && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available models...
              </div>
            )}

            {modelsError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {modelsError}
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Choose the AI model for your conversations. Different models have varying capabilities and costs.
            </p>
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