import { create } from 'zustand'

export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

interface Model {
  id: string
  name: string
  owned_by: string
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  models: Model[]
  isLoadingModels: boolean
  modelsError: string | null
  addMessage: (content: string, isUser: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  sendMessage: (content: string) => Promise<void>
  fetchModels: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  models: [],
  isLoadingModels: false,
  modelsError: null,

  addMessage: (content: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }
    set((state) => ({ messages: [...state.messages, newMessage] }))
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  setError: (error: string | null) => set({ error }),

  clearMessages: () => set({ messages: [], error: null }),

  sendMessage: async (content: string) => {
    const apiKey = localStorage.getItem('openai_api_key')
    const model = localStorage.getItem('openai_model') || 'gpt-4o-mini'
    
    if (!apiKey) {
      set({ error: 'Please set your OpenAI API key in settings' })
      return
    }

    // Add user message
    get().addMessage(content, true)
    set({ isLoading: true, error: null })

    try {
      // Prepare messages for API
      const messages = [
        ...get().messages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content },
      ]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          apiKey,
          model,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add assistant message
      get().addMessage(data.message, false)
    } catch (error) {
      console.error('Chat error:', error)
      const errorObj = error as any
      set({ error: errorObj?.message || 'An error occurred' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchModels: async () => {
    const apiKey = localStorage.getItem('openai_api_key')
    if (!apiKey) {
      // Set default models if no API key
      set({
        models: [
          { id: 'gpt-4o-mini', name: 'gpt-4o-mini', owned_by: 'openai' },
          { id: 'gpt-4o', name: 'gpt-4o', owned_by: 'openai' },
          { id: 'gpt-4-turbo', name: 'gpt-4-turbo', owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', owned_by: 'openai' },
        ],
        modelsError: null
      })
      return
    }

    set({ isLoadingModels: true, modelsError: null })
    
    try {
      const response = await fetch('/api/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch models')
      }

      set({ models: data.models, isLoadingModels: false })
    } catch (error) {
      const errorMessage = (error as any)?.message || 'Failed to fetch models'
      set({ 
        modelsError: errorMessage,
        isLoadingModels: false,
        // Set default models on error
        models: [
          { id: 'gpt-4o-mini', name: 'gpt-4o-mini', owned_by: 'openai' },
          { id: 'gpt-4o', name: 'gpt-4o', owned_by: 'openai' },
          { id: 'gpt-4-turbo', name: 'gpt-4-turbo', owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', owned_by: 'openai' },
        ]
      })
    }
  }
}))