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

// Add new interface for streaming sessions
interface StreamingSession {
  isStreaming: boolean
  streamingMessage: string
  abortController: AbortController | null
}

interface ChatState {
  // Current chat state
  currentChatId: string | null
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean // DEPRECATED - will be computed from streamingSessions
  streamingMessage: string // DEPRECATED - will be computed from streamingSessions
  abortController: AbortController | null // DEPRECATED - moved to streamingSessions
  error: string | null
  selectedModel: string
  reasoningEffort: ReasoningEffort
  
  // NEW: Track streaming sessions per chat
  streamingSessions: Map<string, StreamingSession>
  
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
  stopStreaming: (chatId?: string) => void
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
  
  // NEW: Computed getters for current chat streaming
  getCurrentChatStreaming: () => StreamingSession | null
  isCurrentChatStreaming: () => boolean
  getCurrentStreamingMessage: () => string
  
  // NEW: Streaming session management
  createStreamingSession: (chatId: string) => void
  updateStreamingSession: (chatId: string, updates: Partial<StreamingSession>) => void
  cleanupStreamingSession: (chatId: string) => void
  getStreamingChats: () => string[]
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
          isStreaming: false, // DEPRECATED
          streamingMessage: '', // DEPRECATED
          abortController: null, // DEPRECATED
          error: null,
          selectedModel: 'gpt-4o-mini',
          chats: [],
          models: [],
          isLoadingModels: false,
          modelsError: null,
          reasoningEffort: 'no-reasoning',
          devMode: false,
          unsupportedModelError: null,
          streamingSessions: new Map(), // NEW

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
          setStreaming: (streaming: boolean) => {
            // Update for backward compatibility
            const { currentChatId } = get()
            if (currentChatId) {
              get().updateStreamingSession(currentChatId, { isStreaming: streaming })
            }
          },
          setStreamingMessage: (message: string) => {
            // Update for backward compatibility
            const { currentChatId } = get()
            if (currentChatId) {
              get().updateStreamingSession(currentChatId, { streamingMessage: message })
            }
          },
          setAbortController: (controller: AbortController | null) => {
            // Update for backward compatibility
            const { currentChatId } = get()
            if (currentChatId) {
              get().updateStreamingSession(currentChatId, { abortController: controller })
            }
          },
          
          stopStreaming: (chatId?: string) => {
            const targetChatId = chatId || get().currentChatId
            if (!targetChatId) return

            const { streamingSessions, devMode } = get()
            const session = streamingSessions.get(targetChatId)
            
            if (session?.abortController) {
              session.abortController.abort()
              
              // Find the chat to update
              const chat = get().chats.find(c => c.id === targetChatId)
              
              // If there's partial content, finalize the message
              if (session.streamingMessage.trim() && chat) {
                const assistantDebugInfo = devMode ? {
                  receivedFromAPI: {
                    model: chat.model,
                    response: session.streamingMessage,
                    timestamp: new Date().toISOString(),
                    cancelled: true,
                  }
                } : undefined

                const finalMessage: Message = {
                  id: Date.now().toString(),
                  content: session.streamingMessage,
                  isUser: false,
                  timestamp: new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }),
                  debugInfo: assistantDebugInfo,
                }

                // Update both the chat in history and current messages if applicable
                set((state) => {
                  const updatedChats = state.chats.map(c => {
                    if (c.id === targetChatId) {
                      // Replace the placeholder message with the final cancelled message
                      const updatedMessages = c.messages.map((msg, idx) => 
                        idx === c.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai')
                          ? finalMessage
                          : msg
                      )
                      return {
                        ...c,
                        messages: updatedMessages,
                        updatedAt: new Date().toISOString()
                      }
                    }
                    return c
                  })

                  // If this is the current chat, also update current messages
                  if (state.currentChatId === targetChatId) {
                    const updatedMessages = state.messages.map((msg, idx) => 
                      idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai')
                        ? finalMessage
                        : msg
                    )
                    return { messages: updatedMessages, chats: updatedChats }
                  }

                  return { chats: updatedChats }
                })
              }
              
              // Clean up the streaming session
              get().cleanupStreamingSession(targetChatId)
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
            
            // Load selected chat
            const chatToLoad = state.chats.find(chat => chat.id === chatId)
            if (chatToLoad) {
              // Get streaming state for the new chat
              const streamingSession = state.streamingSessions.get(chatId)
              
              set({
                currentChatId: chatId,
                messages: chatToLoad.messages,
                error: null,
                unsupportedModelError: null,
                selectedModel: chatToLoad.model || 'gpt-4o-mini',
                reasoningEffort: chatToLoad.reasoningEffort || get().getDefaultReasoningEffort(chatToLoad.model || 'gpt-4o-mini'),
                // Update deprecated global streaming state
                isStreaming: streamingSession?.isStreaming || false,
                streamingMessage: streamingSession?.streamingMessage || '',
                abortController: streamingSession?.abortController || null,
              })
            }
          },

          deleteChat: (chatId: string) => {
            // Stop any streaming for this chat first
            get().stopStreaming(chatId)
            
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
                  isStreaming: false,
                  streamingMessage: '',
                  abortController: null,
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
            const currentChatId = get().currentChatId
            
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
            
            // Get the current chat ID after adding message (in case a new chat was created)
            const chatId = get().currentChatId
            if (!chatId) return

            // Create streaming session for this chat
            get().createStreamingSession(chatId)
            
            // Add placeholder AI message
            const placeholderMessage: Message = {
              id: Date.now().toString() + '_ai',
              content: '',
              isUser: false,
              timestamp: new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }),
            }
            
            // Add placeholder to both current messages AND the chat in history
            set(state => {
              const updatedMessages = [...state.messages, placeholderMessage]
              
              // Also update the chat in history to include the placeholder
              const updatedChats = state.chats.map(chat =>
                chat.id === chatId
                  ? { ...chat, messages: updatedMessages, updatedAt: new Date().toISOString() }
                  : chat
              )
              
              return {
                messages: updatedMessages,
                chats: updatedChats,
                isLoading: true
              }
            })

            const startTime = Date.now()

            try {
              const controller = new AbortController()
              get().updateStreamingSession(chatId, { abortController: controller })

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
                  // Remove the placeholder and user message
                  set(state => {
                    const updatedMessages = state.messages.slice(0, -2)
                    const updatedChats = state.chats.map(chat =>
                      chat.id === chatId
                        ? { ...chat, messages: updatedMessages, updatedAt: new Date().toISOString() }
                        : chat
                    )
                    
                    return {
                      messages: state.currentChatId === chatId ? updatedMessages : state.messages,
                      chats: updatedChats,
                      unsupportedModelError: errorData.error,
                      isLoading: false
                    }
                  })
                  get().cleanupStreamingSession(chatId)
                  return
                }
                throw new Error(errorData.error || 'Failed to get response')
              }

              // Handle streaming response
              if (response.body) {
                get().updateStreamingSession(chatId, { isStreaming: true })
                set({ isLoading: false })
                
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
                              // Remove messages and show error
                              set(state => {
                                const updatedMessages = state.messages.slice(0, -2)
                                const updatedChats = state.chats.map(chat =>
                                  chat.id === chatId
                                    ? { ...chat, messages: updatedMessages, updatedAt: new Date().toISOString() }
                                    : chat
                                )
                                
                                return {
                                  messages: state.currentChatId === chatId ? updatedMessages : state.messages,
                                  chats: updatedChats,
                                  unsupportedModelError: parsed.error,
                                }
                              })
                              get().cleanupStreamingSession(chatId)
                              return
                            }
                            throw new Error(parsed.error)
                          }
                          
                          if (parsed.choices?.[0]?.delta?.content) {
                            fullResponse += parsed.choices[0].delta.content
                            get().updateStreamingSession(chatId, { streamingMessage: fullResponse })
                            
                            // Update the placeholder message content in real-time for background chats
                            set(state => {
                              const updatedChats = state.chats.map(chat => {
                                if (chat.id === chatId) {
                                  const updatedMessages = chat.messages.map((msg, idx) => 
                                    idx === chat.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai')
                                      ? { ...msg, content: fullResponse }
                                      : msg
                                  )
                                  return { ...chat, messages: updatedMessages }
                                }
                                return chat
                              })
                              
                              // If this is the current chat, also update the current messages
                              if (state.currentChatId === chatId) {
                                const updatedMessages = state.messages.map((msg, idx) => 
                                  idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai')
                                    ? { ...msg, content: fullResponse }
                                    : msg
                                )
                                return { messages: updatedMessages, chats: updatedChats }
                              }
                              
                              return { chats: updatedChats }
                            })
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
                    // Stream was cancelled - stopStreaming() already handled saving
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

                // Finalize the message
                set(state => {
                  // Update the placeholder message with final content and debug info
                  const finalMessage = {
                    id: Date.now().toString(), // Give it a proper ID
                    content: fullResponse,
                    isUser: false,
                    timestamp: new Date().toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }),
                    debugInfo: assistantDebugInfo,
                  }
                  
                  // Update chats array
                  const updatedChats = state.chats.map(chat => {
                    if (chat.id === chatId) {
                      const updatedMessages = chat.messages.map((msg, idx) => 
                        idx === chat.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai')
                          ? finalMessage
                          : msg
                      )
                      return { ...chat, messages: updatedMessages, updatedAt: new Date().toISOString() }
                    }
                    return chat
                  })
                  
                  // If this is the current chat, also update the current messages
                  if (state.currentChatId === chatId) {
                    const updatedMessages = state.messages.map((msg, idx) => 
                      idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai')
                        ? finalMessage
                        : msg
                    )
                    return { messages: updatedMessages, chats: updatedChats }
                  }
                  
                  return { chats: updatedChats }
                })
                
                // Clean up streaming session
                get().cleanupStreamingSession(chatId)
              }
            } catch (error: any) {
              console.error('Chat error:', error)
              if (error.name !== 'AbortError') {
                // Only set error if we're still on the same chat
                if (get().currentChatId === chatId) {
                  set({ 
                    error: error?.message || 'An error occurred while sending the message',
                  })
                }
                get().cleanupStreamingSession(chatId)
              }
            } finally {
              // Only clear loading if we're still on the same chat
              if (get().currentChatId === chatId) {
                set({ isLoading: false })
              }
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
          },

          // NEW: Computed getters for current chat streaming
          getCurrentChatStreaming: () => {
            const { currentChatId, streamingSessions } = get()
            if (!currentChatId) return null
            return streamingSessions.get(currentChatId) || null
          },

          isCurrentChatStreaming: () => {
            const session = get().getCurrentChatStreaming()
            return session?.isStreaming || false
          },

          getCurrentStreamingMessage: () => {
            const session = get().getCurrentChatStreaming()
            return session?.streamingMessage || ''
          },

          // NEW: Get list of currently streaming chats
          getStreamingChats: () => {
            const { streamingSessions } = get()
            return Array.from(streamingSessions.entries())
              .filter(([_, session]) => session.isStreaming)
              .map(([chatId]) => chatId)
          },

          // NEW: Streaming session management
          createStreamingSession: (chatId: string) => {
            set((state) => {
              const sessions = new Map(state.streamingSessions)
              sessions.set(chatId, {
                isStreaming: false,
                streamingMessage: '',
                abortController: null,
              })
              return { streamingSessions: sessions }
            })
          },

          updateStreamingSession: (chatId: string, updates: Partial<StreamingSession>) => {
            set((state) => {
              const sessions = new Map(state.streamingSessions)
              const current = sessions.get(chatId) || {
                isStreaming: false,
                streamingMessage: '',
                abortController: null,
              }
              sessions.set(chatId, { ...current, ...updates })
              
              // Update deprecated global state if this is the current chat
              const updateState: any = { streamingSessions: sessions }
              if (state.currentChatId === chatId) {
                if ('isStreaming' in updates) updateState.isStreaming = updates.isStreaming
                if ('streamingMessage' in updates) updateState.streamingMessage = updates.streamingMessage
                if ('abortController' in updates) updateState.abortController = updates.abortController
              }
              
              return updateState
            })
          },

          cleanupStreamingSession: (chatId: string) => {
            set((state) => {
              const sessions = new Map(state.streamingSessions)
              sessions.delete(chatId)
              
              // Clear deprecated global state if this was the current chat
              const updateState: any = { streamingSessions: sessions }
              if (state.currentChatId === chatId) {
                updateState.isStreaming = false
                updateState.streamingMessage = ''
                updateState.abortController = null
              }
              
              return updateState
            })
          },
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
          // Don't persist streaming sessions
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