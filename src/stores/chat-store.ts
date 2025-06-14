import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface ChatState {
  // Current chat state
  currentChatId: string | null
  messages: Message[]
  isLoading: boolean
  error: string | null
  
  // Chat history
  chats: Chat[]
  
  // Models state
  models: Model[]
  isLoadingModels: boolean
  modelsError: string | null
  
  // Actions
  addMessage: (content: string, isUser: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  sendMessage: (content: string) => Promise<void>
  fetchModels: () => Promise<void>
  
  // Chat history actions
  createNewChat: () => void
  loadChat: (chatId: string) => void
  deleteChat: (chatId: string) => void
  updateChatTitle: (chatId: string, title: string) => void
}

// Helper function to generate chat title from first message
const generateChatTitle = (firstMessage: string): string => {
  const maxLength = 30
  const trimmed = firstMessage.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.substring(0, maxLength) + '...'
}

// Add this helper function at the top of the file after imports
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      // Create a debounced function to update chat history
      const debouncedUpdateChatHistory = debounce((chatId: string, messages: Message[]) => {
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? { ...chat, messages, updatedAt: new Date().toISOString() }
              : chat
          )
        }))
      }, 500) // 500ms delay

      return {
        // Initial state
        currentChatId: null,
        messages: [],
        isLoading: false,
        error: null,
        chats: [],
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
          
          set((state) => {
            const updatedMessages = [...state.messages, newMessage]
            
            // If this is the first message and we don't have a current chat, create one
            if (!state.currentChatId && isUser) {
              const newChat: Chat = {
                id: Date.now().toString(),
                title: generateChatTitle(content),
                messages: updatedMessages,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              
              return {
                messages: updatedMessages,
                currentChatId: newChat.id,
                chats: [newChat, ...state.chats],
              }
            }
            
            // For existing chats, update messages immediately but debounce chat history update
            if (state.currentChatId) {
              debouncedUpdateChatHistory(state.currentChatId, updatedMessages)
            }
            
            // Only update messages array immediately
            return { messages: updatedMessages }
          })
        },

        setLoading: (loading: boolean) => set({ isLoading: loading }),
        
        setError: (error: string | null) => set({ error }),

        clearMessages: () => set({ messages: [], error: null }),

        createNewChat: () => {
          const state = get()
          
          // Only save if there are messages
          if (state.currentChatId && state.messages.length > 0) {
            // Chat is already auto-saved, no need to update again
          }
          
          // Clear current chat
          set({
            currentChatId: null,
            messages: [],
            error: null,
          })
        },

        loadChat: (chatId: string) => {
          const state = get()
          
          // No need to save current chat as it's already auto-saved
          
          // Load selected chat
          const chatToLoad = state.chats.find(chat => chat.id === chatId)
          if (chatToLoad) {
            set({
              currentChatId: chatId,
              messages: chatToLoad.messages,
              error: null,
            })
          }
        },

        deleteChat: (chatId: string) => {
          set((state) => {
            const updatedChats = state.chats.filter(chat => chat.id !== chatId)
            
            // If we're deleting the current chat, clear it
            if (state.currentChatId === chatId) {
              return {
                chats: updatedChats,
                currentChatId: null,
                messages: [],
                error: null,
              }
            }
            
            return { chats: updatedChats }
          })
        },

        updateChatTitle: (chatId: string, title: string) => {
          set((state) => ({
            chats: state.chats.map(chat =>
              chat.id === chatId ? { ...chat, title } : chat
            )
          }))
        },

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
      }
    },
    {
      name: 'chat-storage',
      partialize: (state) => ({
        chats: state.chats,
        currentChatId: state.currentChatId,
        messages: state.messages, // Also persist current messages
      }),
      version: 1, // Add versioning for future migrations
      migrate: (persistedState: any, version: number) => {
        // Handle future migrations if needed
        return persistedState
      },
    }
  )
)