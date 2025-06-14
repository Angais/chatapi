import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'

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

// Modelos que deben ser excluidos de la lista (nunca mostrar)
export const EXCLUDED_MODELS = [
  'codex-mini-latest',
  'gpt-4o-realtime-preview-2025-06-03',
  'gpt-4o-audio-preview-2025-06-03',
  'dall-e-3',
  'dall-e-2',
  'tts-1-hd',
  'tts-1-1106',
  'tts-1-hd-1106',
  'text-embedding-3-small',
  'text-embedding-3-large',
  'gpt-4o-realtime-preview-2024-10-01',
  'gpt-4o-audio-preview-2024-10-01',
  'gpt-4o-audio-preview',
  'gpt-4o-realtime-preview',
  'omni-moderation-latest',
  'omni-moderation-2024-09-26',
  'gpt-4o-realtime-preview-2024-12-17',
  'gpt-4o-audio-preview-2024-12-17',
  'gpt-4o-mini-realtime-preview-2024-12-17',
  'gpt-4o-mini-audio-preview-2024-12-17',
  'gpt-4o-mini-realtime-preview',
  'gpt-4o-mini-audio-preview',
  'gpt-4o-search-preview-2025-03-11',
  'gpt-4o-search-preview',
  'gpt-4o-mini-search-preview-2025-03-11',
  'gpt-4o-mini-search-preview',
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
  'gpt-4o-mini-tts',
  'gpt-image-1',
  'tts-1',
  'whisper-1',
  'text-embedding-ada-002',
  'davinci-002',
  'babbage-002'
]

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
  isStreaming: boolean
  streamingMessage: string
  abortController: AbortController | null
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
  
  // Unsupported model state
  unsupportedModelError: string | null
  
  // Actions
  init: () => void
  addMessage: (content: string, isUser: boolean, debugInfo?: any) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setStreamingMessage: (message: string) => void
  setAbortController: (controller: AbortController | null) => void
  stopStreaming: () => void
  setError: (error: string | null) => void
  setUnsupportedModelError: (error: string | null) => void
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
  
  // Streaming helpers
  isReasoningModel: (modelId?: string) => boolean
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
  devtools(
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
          isStreaming: false,
          streamingMessage: '',
          abortController: null,
          error: null,
          selectedModel: 'gpt-4o-mini',
          chats: [],
          models: [],
          isLoadingModels: false,
          modelsError: null,
          reasoningEffort: 'no-reasoning',
          devMode: false,
          unsupportedModelError: null,

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
          setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
          setStreamingMessage: (message: string) => set({ streamingMessage: message }),
          setAbortController: (controller: AbortController | null) => set({ abortController: controller }),
          
          stopStreaming: () => {
            const { abortController, streamingMessage, devMode, selectedModel } = get()
            if (abortController) {
              abortController.abort()
              
              // Si hay contenido parcial generado, guardarlo como mensaje completo
              if (streamingMessage.trim()) {
                const assistantDebugInfo = devMode ? {
                  receivedFromAPI: {
                    model: selectedModel,
                    response: streamingMessage,
                    timestamp: new Date().toISOString(),
                    cancelled: true,
                  }
                } : undefined

                get().addMessage(streamingMessage, false, assistantDebugInfo)
              }
              
              set({ 
                abortController: null,
                isStreaming: false,
                isLoading: false,
                streamingMessage: ''
              })
            }
          },

          setError: (error: string | null) => set({ error }),
          setUnsupportedModelError: (error: string | null) => set({ unsupportedModelError: error }),
          clearMessages: () => set({ messages: [], error: null, unsupportedModelError: null }),

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
              unsupportedModelError: null,
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
                unsupportedModelError: null,
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
                  unsupportedModelError: null,
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

            // Clear previous errors
            set({ error: null, unsupportedModelError: null })

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
                stream: true,
              }
            } : undefined

            // Add user message with debug info
            get().addMessage(content, true, userDebugInfo)
            
            // Add placeholder AI message that will be updated during streaming
            const placeholderMessage = {
              id: Date.now().toString() + '_ai',
              content: '',
              isUser: false,
              timestamp: new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }),
            }
            
            set(state => ({
              messages: [...state.messages, placeholderMessage],
              isLoading: true
            }))

            const startTime = Date.now()

            try {
              const controller = new AbortController()
              set({ abortController: controller })

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
                  stream: true,
                }),
                signal: controller.signal,
              })

              if (!response.ok) {
                const errorData = await response.json()
                if (errorData.unsupportedModel) {
                  // Remove the last user message
                  set(state => ({
                    messages: state.messages.slice(0, -1),
                    unsupportedModelError: errorData.error,
                    isLoading: false
                  }))
                  return
                }
                throw new Error(errorData.error || 'Failed to get response')
              }

              // Handle streaming response
              if (response.body) {
                set({ isStreaming: true, isLoading: false })
                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let fullResponse = ''
                let usage = null
                const responseTime = Date.now() - startTime

                try {
                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    
                    const chunk = decoder.decode(value, { stream: true })
                    const lines = chunk.split('\n')
                    
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        const data = line.slice(6)
                        if (data === '[DONE]') {
                          break
                        }
                        
                        try {
                          const parsed = JSON.parse(data)
                          
                          if (parsed.error) {
                            if (parsed.unsupportedModel) {
                              // Remove the last user message
                              set(state => ({
                                messages: state.messages.slice(0, -1),
                                unsupportedModelError: parsed.error,
                                isStreaming: false,
                                streamingMessage: '',
                                isLoading: false
                              }))
                              return
                            }
                            throw new Error(parsed.error)
                          }
                          
                          if (parsed.choices?.[0]?.delta?.content) {
                            fullResponse += parsed.choices[0].delta.content
                            set({ streamingMessage: fullResponse })
                          }
                          if (parsed.usage) {
                            usage = parsed.usage
                          }
                        } catch (e: any) {
                          if (e.message !== 'Unexpected end of JSON input') {
                            console.error('JSON parse error:', e)
                          }
                        }
                      }
                    }
                  }
                } catch (error: any) {
                  if (error.name === 'AbortError') {
                    // Stream was cancelled - stopStreaming() already handled saving the partial message
                    return
                  }
                  throw error
                }

                // Debug info for assistant response
                const assistantDebugInfo = devMode ? {
                  receivedFromAPI: {
                    model,
                    response: fullResponse,
                    usage,
                    timestamp: new Date().toISOString(),
                    responseTime,
                  }
                } : undefined

                // Si ya hay un mensaje streaming en progreso (último mensaje es IA), actualizarlo
                // Si no, crear un nuevo mensaje
                set(state => {
                  const lastMessage = state.messages[state.messages.length - 1]
                  const isUpdatingStreamingMessage = lastMessage && !lastMessage.isUser
                  
                  let updatedMessages
                  if (isUpdatingStreamingMessage) {
                    // Actualizar el último mensaje con el contenido completo
                    updatedMessages = [
                      ...state.messages.slice(0, -1),
                      {
                        ...lastMessage,
                        content: fullResponse,
                        debugInfo: assistantDebugInfo,
                      }
                    ]
                  } else {
                    // Crear nuevo mensaje
                    const newMessage = {
                      id: Date.now().toString(),
                      content: fullResponse,
                      isUser: false,
                      timestamp: new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }),
                      debugInfo: assistantDebugInfo,
                    }
                    updatedMessages = [...state.messages, newMessage]
                  }
                  
                  // Update chat history if needed
                  if (state.currentChatId) {
                    debouncedUpdateChatHistory(state.currentChatId, updatedMessages)
                  }
                  
                  return {
                    messages: updatedMessages,
                    isStreaming: false,
                    streamingMessage: ''
                  }
                })
              }
            } catch (error: any) {
              console.error('Chat error:', error)
              if (error.name !== 'AbortError') {
                set({ 
                  error: error?.message || 'An error occurred while sending the message',
                  isStreaming: false,
                  streamingMessage: ''
                })
              }
            } finally {
              set({ 
                isLoading: false,
                abortController: null
              })
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
            // Devuelve todos los modelos excepto los que están en los presets Y los excluidos
            return models.filter(model => 
              !presetIds.includes(model.id) && 
              !EXCLUDED_MODELS.includes(model.id)
            )
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
          },

          isReasoningModel: (modelId?: string) => {
            const model = modelId || get().selectedModel
            const reasoningModels = ['o1', 'o1-preview', 'o1-mini', 'o3', 'o3-pro', 'o4-mini']
            return reasoningModels.some(rm => model.includes(rm))
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
    ),
    { name: 'chat-store' }
  )
)