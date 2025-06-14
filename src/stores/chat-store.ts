import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
  // Información de depuración para Dev Mode
  debugInfo?: {
    // Para mensajes del usuario (enviados a la API)
    sentToAPI?: {
      model: string
      messages: Array<{ role: string; content: string }>
      temperature?: number
      max_tokens?: number
      max_completion_tokens?: number
      reasoning_effort?: ReasoningEffort
      timestamp: string
    }
    // Para respuestas del asistente (recibidas de la API)
    receivedFromAPI?: {
      model: string
      response: string
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
      }
      timestamp: string
      responseTime?: number
      reasoningNotSupported?: boolean
    }
  }
}

interface Model {
  id: string
  name: string
  owned_by: string
}

// Tipo para los diferentes niveles de reasoning effort
export type ReasoningEffort = 'low' | 'medium' | 'high' | 'no-reasoning'

// Presets de modelos predefinidos
export const MODEL_PRESETS = [
  { id: 'gpt-4o', displayName: 'GPT-4o' },
  { id: 'o3', displayName: 'o3' },
  { id: 'o3-pro', displayName: 'o3-pro' },
  { id: 'o4-mini', displayName: 'o4-mini' },
  { id: 'gpt-4.1', displayName: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 mini' },
  { id: 'gpt-4.1-nano', displayName: 'GPT-4.1 nano' },
]

// Modelos que soportan reasoning effort
export const REASONING_MODELS = ['o3', 'o3-pro', 'o4-mini']

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  model: string
  reasoningEffort?: ReasoningEffort
}

interface ChatState {
  // Current chat state
  currentChatId: string | null
  messages: Message[]
  isLoading: boolean
  error: string | null
  selectedModel: string
  reasoningEffort: ReasoningEffort
  
  // Chat history
  chats: Chat[]
  
  // Models state
  models: Model[]
  isLoadingModels: boolean
  modelsError: string | null
  
  // Dev Mode state
  devMode: boolean
  
  // Actions
  init: () => void
  addMessage: (content: string, isUser: boolean, debugInfo?: any) => void
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
  setSelectedModel: (model: string) => void
  setReasoningEffort: (effort: ReasoningEffort) => void
  
  // Dev Mode actions
  setDevMode: (devMode: boolean) => void
  
  // Model filtering helpers
  getAvailablePresets: () => Array<{ id: string; displayName: string }>
  getOtherModels: () => Model[]
  
  // Reasoning effort helpers
  shouldShowReasoningSelector: () => boolean
  getDefaultReasoningEffort: (modelId: string) => ReasoningEffort
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
        selectedModel: 'gpt-4o-mini',
        chats: [],
        models: [],
        isLoadingModels: false,
        modelsError: null,
        reasoningEffort: 'no-reasoning',
        devMode: false,

        init: () => {
          const state = get()
          if (state) {
            const { currentChatId, chats } = state
            let modelToSet = localStorage.getItem('openai_preferred_model') || 'gpt-4o-mini'
            let reasoningEffortToSet: ReasoningEffort = 'no-reasoning'
  
            if (currentChatId) {
              const currentChat = chats.find(c => c.id === currentChatId)
              if (currentChat && currentChat.model) {
                modelToSet = currentChat.model
                reasoningEffortToSet = currentChat.reasoningEffort || get().getDefaultReasoningEffort(modelToSet)
              }
            } else {
              reasoningEffortToSet = get().getDefaultReasoningEffort(modelToSet)
            }
            
            set({ 
              selectedModel: modelToSet,
              reasoningEffort: reasoningEffortToSet
            })
          }
        },

        addMessage: (content: string, isUser: boolean, debugInfo?: any) => {
          const newMessage: Message = {
            id: Date.now().toString(),
            content,
            isUser,
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            debugInfo,
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
                model: get().selectedModel,
                reasoningEffort: get().reasoningEffort,
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
          
          const preferredModel = localStorage.getItem('openai_preferred_model') || 'gpt-4o-mini'
          const defaultReasoningEffort = get().getDefaultReasoningEffort(preferredModel)
          
          // Clear current chat
          set({
            currentChatId: null,
            messages: [],
            error: null,
            selectedModel: preferredModel,
            reasoningEffort: defaultReasoningEffort,
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
              selectedModel: chatToLoad.model || 'gpt-4o-mini',
              reasoningEffort: chatToLoad.reasoningEffort || get().getDefaultReasoningEffort(chatToLoad.model || 'gpt-4o-mini'),
            })
          }
        },

        deleteChat: (chatId: string) => {
          set((state) => {
            const updatedChats = state.chats.filter(chat => chat.id !== chatId)
            
            // If we're deleting the current chat, clear it
            if (state.currentChatId === chatId) {
              const preferredModel = localStorage.getItem('openai_preferred_model') || 'gpt-4o-mini'
              const defaultReasoningEffort = get().getDefaultReasoningEffort(preferredModel)
              return {
                chats: updatedChats,
                currentChatId: null,
                messages: [],
                error: null,
                selectedModel: preferredModel,     
                reasoningEffort: defaultReasoningEffort,
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

        setSelectedModel: (model: string) => {
          const defaultReasoningEffort = get().getDefaultReasoningEffort(model)
          set({ 
            selectedModel: model,
            reasoningEffort: defaultReasoningEffort
          })

          // Persist as preferred model for next time
          localStorage.setItem('openai_preferred_model', model)

          // Update model for current chat if there is one
          const { currentChatId, chats } = get()
          if (currentChatId) {
            const currentChat = chats.find(c => c.id === currentChatId)
            // Only update if model has actually changed to avoid unnecessary re-renders
            if (currentChat && currentChat.model !== model) {
              set(state => ({
                chats: state.chats.map(chat =>
                  chat.id === currentChatId ? { 
                    ...chat, 
                    model,
                    reasoningEffort: defaultReasoningEffort
                  } : chat
                ),
              }))
            }
          }
        },

        sendMessage: async (content: string) => {
          const apiKey = localStorage.getItem('openai_api_key')
          const model = get().selectedModel
          const reasoningEffort = get().reasoningEffort
          const devMode = get().devMode
          
          if (!apiKey) {
            set({ error: 'Please set your OpenAI API key in settings' })
            return
          }

          // Prepare messages for API
          const currentMessages = get().messages
          const messagesToSend = [
            ...currentMessages.map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.content,
            })),
            { role: 'user', content },
          ]

          // Debug info for user message
          const userDebugInfo = devMode ? {
            sentToAPI: {
              model,
              messages: messagesToSend,
              temperature: 0.7,
              max_tokens: model.includes('o3') || model.includes('o4') ? undefined : 1000,
              max_completion_tokens: model.includes('o3') || model.includes('o4') ? 1000 : undefined,
              reasoning_effort: reasoningEffort !== 'no-reasoning' ? reasoningEffort : undefined,
              timestamp: new Date().toISOString(),
            }
          } : undefined

          // Add user message with debug info
          get().addMessage(content, true, userDebugInfo)
          set({ isLoading: true, error: null })

          const startTime = Date.now()

          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: messagesToSend,
                apiKey,
                model,
                reasoningEffort,
              }),
            })

            const data = await response.json()
            const responseTime = Date.now() - startTime

            if (!response.ok) {
              throw new Error(data.error || 'Failed to get response')
            }

            // If the model doesn't support reasoning effort, update it automatically
            if (data.reasoningNotSupported && reasoningEffort !== 'no-reasoning') {
              console.log(`Auto-configuring model ${model} to use no-reasoning`)
              get().setReasoningEffort('no-reasoning')
              
              // Update current chat model settings if there's an active chat
              const { currentChatId, chats } = get()
              if (currentChatId) {
                set(state => ({
                  chats: state.chats.map(chat =>
                    chat.id === currentChatId ? { 
                      ...chat, 
                      reasoningEffort: 'no-reasoning'
                    } : chat
                  ),
                }))
              }
            }

            // Debug info for assistant response
            const assistantDebugInfo = devMode ? {
              receivedFromAPI: {
                model,
                response: data.message,
                usage: data.usage, // Si la API devuelve usage info
                timestamp: new Date().toISOString(),
                responseTime,
                reasoningNotSupported: data.reasoningNotSupported,
              }
            } : undefined

            // Add assistant message with debug info
            get().addMessage(data.message, false, assistantDebugInfo)
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
                 },

         getAvailablePresets: () => {
           const { models } = get()
           // Solo devuelve los presets que están disponibles en la API
           return MODEL_PRESETS.filter(preset => 
             models.some(model => model.id === preset.id)
           )
         },

         getOtherModels: () => {
           const { models } = get()
           const presetIds = MODEL_PRESETS.map(preset => preset.id)
           // Devuelve todos los modelos excepto los que están en los presets
           return models.filter(model => !presetIds.includes(model.id))
         },

         setReasoningEffort: (effort: ReasoningEffort) => {
           set({ reasoningEffort: effort })
         },

                   shouldShowReasoningSelector: () => {
            const { selectedModel, getOtherModels } = get()
            // Mostrar para modelos de reasoning específicos o modelos "otros"
            const otherModels = getOtherModels()
            const isOtherModel = otherModels.some(model => model.id === selectedModel)
            return REASONING_MODELS.includes(selectedModel) || isOtherModel
          },

          getDefaultReasoningEffort: (modelId: string) => {
            const { getOtherModels } = get()
            const otherModels = getOtherModels()
            const isOtherModel = otherModels.some(model => model.id === modelId)
            
            if (REASONING_MODELS.includes(modelId)) {
              return 'medium' // Default para o3, o3-pro, o4-mini
            }
            
            if (isOtherModel) {
              return 'no-reasoning' // Default para modelos "otros"
            }
            
            return 'no-reasoning' // Default para todos los demás
          },

          setDevMode: (devMode: boolean) => {
            set({ devMode })
          }
      }
    },
    {
      name: 'chat-storage',
      partialize: (state) => ({
        chats: state.chats,
        currentChatId: state.currentChatId,
        messages: state.messages,
        reasoningEffort: state.reasoningEffort,
        devMode: state.devMode,
      }),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          if (persistedState && persistedState.chats) {
            persistedState.chats = persistedState.chats.map((chat: any) => ({
              ...chat,
              model: 'gpt-4o-mini',
              reasoningEffort: 'no-reasoning',
            }))
          }
          if (persistedState) {
            persistedState.reasoningEffort = 'no-reasoning'
          }
        }
        if (version < 3) {
          if (persistedState) {
            persistedState.devMode = false
          }
        }
        return persistedState
      },
    }
  )
)