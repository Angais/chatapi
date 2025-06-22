import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storeImage, cleanupOldImages } from '@/lib/image-cache'
import { devtools } from 'zustand/middleware'

export interface MessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'auto' | 'low' | 'high'
  }
}

export interface Message {
  id: string
  content: string | MessageContent[]
  isUser: boolean
  timestamp: string
  // Store image generation ID for multi-turn image editing
  imageGenerationId?: string
  // Información de depuración para Dev Mode
  debugInfo?: {
    // Para mensajes del usuario (enviados a la API)
    sentToAPI?: {
      model: string
      messages: Array<{ role: string; content: string | MessageContent[] }>
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

// Realtime models for voice
export const REALTIME_MODELS = [
  { id: 'gpt-4o-realtime-preview', displayName: 'GPT-4o Realtime' },
  { id: 'gpt-4o-mini-realtime-preview', displayName: 'GPT-4o-mini Realtime' },
]

// Modelos que soportan reasoning effort
export const REASONING_MODELS = ['o3', 'o3-pro', 'o4-mini']

// Models that support vision/image inputs
export const VISION_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4-turbo',
  'gpt-4-vision-preview',
  'gpt-4o-2024-11-20',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-05-13',
  'gpt-4o-mini-2024-07-18',
]

// Image quality types for image generation
export type ImageQuality = 'low' | 'medium' | 'high'

// Image streaming option
export type ImageStreaming = 'enabled' | 'disabled'

// Image aspect ratio options
export type ImageAspectRatio = 'square' | 'portrait' | 'landscape' | 'auto'

// Available aspect ratios with their sizes
export const ASPECT_RATIOS = [
  { id: 'square' as const, name: 'Square', size: '1024x1024' },
  { id: 'portrait' as const, name: 'Portrait', size: '1024x1536' },
  { id: 'landscape' as const, name: 'Landscape', size: '1536x1024' },
  { id: 'auto' as const, name: 'Auto', size: 'auto' },
]

// Add image models - gpt-4o supports image generation with Responses API
// Using internal ID to distinguish from regular gpt-4o
export const IMAGE_MODELS = [
  'gpt-4o-images'
]

// Map internal image model IDs to actual API model IDs
export const IMAGE_MODEL_MAP: Record<string, string> = {
  'gpt-4o-images': 'gpt-4o'
}

// Modelos que deben ser excluidos de la lista (nunca mostrar)
export const EXCLUDED_MODELS = [
  'codex-mini-latest',
  'gpt-4o-realtime-preview-2025-06-03',
  'gpt-4o-audio-preview-2025-06-03',
  'dall-e-3',
  'dall-e-2',
  'gpt-image-1', // Keep excluded since we use gpt-4o for images now
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
  'tts-1',
  'whisper-1',
  'text-embedding-ada-002',
  'davinci-002',
  'babbage-002'
]

// Voice mode types
export type VoiceMode = 'text-to-voice' | 'voice-to-voice' | 'none'

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  model: string
  reasoningEffort?: ReasoningEffort
  voiceMode?: VoiceMode
  isVoiceSessionEnded?: boolean
  hasImages?: boolean
}

// Add new interface for streaming sessions
interface StreamingSession {
  isStreaming: boolean
  streamingMessage: string
  abortController: AbortController | null
  placeholderId?: string // For image generation placeholders
}

// Voice options for Realtime API
export const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'ash', name: 'Ash' },
  { id: 'ballad', name: 'Ballad' },
  { id: 'coral', name: 'Coral' },
  { id: 'echo', name: 'Echo' },
  { id: 'sage', name: 'Sage' },
  { id: 'shimmer', name: 'Shimmer' },
  { id: 'verse', name: 'Verse' },
]

// VAD type options
export const VAD_TYPES = [
  { id: 'server_vad', name: 'Server VAD', description: 'Uses silence detection' },
  { id: 'semantic_vad', name: 'Semantic VAD', description: 'Uses AI to detect when you\'re done speaking' },
]

// Transcription models
export const TRANSCRIPTION_MODELS = [
  { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe' },
  { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe' },
  { id: 'whisper-1', name: 'Whisper' },
]

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
  voiceMode: VoiceMode
  isVoiceSessionEnded: boolean
  
  // NEW: Image generation settings
  imageQuality: ImageQuality
  imageStreaming: ImageStreaming
  imageAspectRatio: ImageAspectRatio
  
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
  
  // Settings state
  temperature: number
  maxTokens: number
  voice: string
  systemInstructions: string
  // VAD settings
  vadType: 'server_vad' | 'semantic_vad'
  vadThreshold: number
  vadPrefixPadding: number
  vadSilenceDuration: number
  vadEagerness: 'low' | 'medium' | 'high' | 'auto'
  // Transcription settings
  transcriptionModel: string
  transcriptionLanguage: string
  
  // Actions
  init: () => void
  addMessage: (content: string | MessageContent[], isUser: boolean, debugInfo?: any) => void
  updateMessage: (messageId: string, newContent: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setStreamingMessage: (message: string) => void
  setAbortController: (controller: AbortController | null) => void
  stopStreaming: (chatId?: string) => void
  setError: (error: string | null) => void
  setUnsupportedModelError: (error: string | null) => void
  clearMessages: () => void
  sendMessage: (content: string, images?: Array<{ url: string; file: File }>) => Promise<void>
  sendImageMessage: (prompt: string, images?: Array<{ url: string; file: File }>) => Promise<void>
  fetchModels: () => Promise<void>
  
  // Chat history actions
  createNewChat: () => void
  loadChat: (chatId: string) => void
  deleteChat: (chatId: string) => void
  updateChatTitle: (chatId: string, title: string) => void
  setSelectedModel: (model: string) => void
  setReasoningEffort: (effort: ReasoningEffort) => void
  setVoiceMode: (mode: VoiceMode) => void
  setVoiceSessionEnded: (ended: boolean) => void
  
  // NEW: Image generation actions
  setImageQuality: (quality: ImageQuality) => void
  setImageStreaming: (streaming: ImageStreaming) => void
  setImageAspectRatio: (aspectRatio: ImageAspectRatio) => void
  
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
  isRealtimeModel: (modelId?: string) => boolean
  isVisionModel: (modelId?: string) => boolean
  isImageModel: (modelId?: string) => boolean
  chatHasImages: (chatId?: string) => boolean
  getApiModelId: (modelId: string) => string
  
  // NEW: Computed getters for current chat streaming
  getCurrentChatStreaming: () => StreamingSession | null
  isCurrentChatStreaming: () => boolean
  getCurrentStreamingMessage: () => string
  
  // NEW: Streaming session management
  createStreamingSession: (chatId: string) => void
  updateStreamingSession: (chatId: string, updates: Partial<StreamingSession>) => void
  cleanupStreamingSession: (chatId: string) => void
  getStreamingChats: () => string[]
  
  // Settings actions
  setTemperature: (temperature: number) => void
  setMaxTokens: (maxTokens: number) => void
  setVoice: (voice: string) => void
  setSystemInstructions: (instructions: string) => void
  // VAD settings actions
  setVadType: (type: 'server_vad' | 'semantic_vad') => void
  setVadThreshold: (threshold: number) => void
  setVadPrefixPadding: (padding: number) => void
  setVadSilenceDuration: (duration: number) => void
  setVadEagerness: (eagerness: 'low' | 'medium' | 'high' | 'auto') => void
  // Transcription settings actions
  setTranscriptionModel: (model: string) => void
  setTranscriptionLanguage: (language: string) => void
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
          selectedModel: 'gpt-4o',
          reasoningEffort: 'medium',
          voiceMode: 'none',
          isVoiceSessionEnded: false,
          
          // NEW: Default image generation settings
          imageQuality: 'medium',
          imageStreaming: 'enabled',
          imageAspectRatio: 'square',
          
          // NEW: Initialize streaming sessions
          streamingSessions: new Map(),
          
                  chats: [],
        models: [],
        isLoadingModels: false,
        modelsError: null,
        devMode: false,
          unsupportedModelError: null,
          
          // Settings
          temperature: 0.7,
          maxTokens: 1000,
          voice: 'alloy',
          systemInstructions: '',
          vadType: 'server_vad',
          vadThreshold: 0.5,
          vadPrefixPadding: 300,
          vadSilenceDuration: 500,
          vadEagerness: 'medium',
          transcriptionModel: 'gpt-4o-transcribe',
          transcriptionLanguage: 'en',

          init: () => {
            const state = get()
            if (state) {
              const { currentChatId, chats } = state
              let modelToSet = localStorage.getItem('openai_preferred_model') || 'gpt-4o-mini'
              let reasoningEffortToSet: ReasoningEffort = 'no-reasoning'
              
              // Load saved settings
              const savedTemperature = localStorage.getItem('openai_temperature')
              const savedMaxTokens = localStorage.getItem('openai_max_tokens')
              const savedVoice = localStorage.getItem('openai_voice')
              const savedSystemInstructions = localStorage.getItem('openai_system_instructions')
              const savedVadType = localStorage.getItem('openai_vad_type')
              const savedVadThreshold = localStorage.getItem('openai_vad_threshold')
              const savedVadPrefixPadding = localStorage.getItem('openai_vad_prefix_padding')
              const savedVadSilenceDuration = localStorage.getItem('openai_vad_silence_duration')
              const savedVadEagerness = localStorage.getItem('openai_vad_eagerness')
              const savedTranscriptionModel = localStorage.getItem('openai_transcription_model')
              const savedTranscriptionLanguage = localStorage.getItem('openai_transcription_language')
              
              if (savedTemperature) set({ temperature: parseFloat(savedTemperature) })
              if (savedMaxTokens) set({ maxTokens: parseInt(savedMaxTokens) })
              if (savedVoice) set({ voice: savedVoice })
              if (savedSystemInstructions) set({ systemInstructions: savedSystemInstructions })
              if (savedVadType) set({ vadType: savedVadType as 'server_vad' | 'semantic_vad' })
              if (savedVadThreshold) set({ vadThreshold: parseFloat(savedVadThreshold) })
              if (savedVadPrefixPadding) set({ vadPrefixPadding: parseInt(savedVadPrefixPadding) })
              if (savedVadSilenceDuration) set({ vadSilenceDuration: parseInt(savedVadSilenceDuration) })
              if (savedVadEagerness) set({ vadEagerness: savedVadEagerness as 'low' | 'medium' | 'high' | 'auto' })
              if (savedTranscriptionModel) set({ transcriptionModel: savedTranscriptionModel })
              if (savedTranscriptionLanguage) set({ transcriptionLanguage: savedTranscriptionLanguage })
    
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
              
              // Cleanup old images on init (older than 7 days)
              cleanupOldImages().catch(console.error)
            }
          },

          addMessage: (content: string | MessageContent[], isUser: boolean, debugInfo?: any) => {
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
                // Generate title from content
                let title: string
                if (typeof content === 'string') {
                  title = generateChatTitle(content)
                } else {
                  // For array content, find the first text content
                  const textContent = content.find(c => c.type === 'text')?.text || 'Image conversation'
                  title = generateChatTitle(textContent)
                }
                
                // Check if there are images
                const hasImages = Array.isArray(content) && content.some(c => c.type === 'image_url')
                
                const newChat: Chat = {
                  id: Date.now().toString(),
                  title,
                  messages: updatedMessages,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  model: get().selectedModel,
                  reasoningEffort: get().reasoningEffort,
                  voiceMode: get().voiceMode,
                  isVoiceSessionEnded: false,
                  hasImages,
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

          updateMessage: (messageId: string, newContent: string) => {
            const { currentChatId } = get()
            if (!currentChatId) return

            set((state) => {
              // Update messages currently in view
              const updatedMessages = state.messages.map(m =>
                m.id === messageId ? { ...m, content: newContent } : m
              )

              // Update the chat stored in history
              const updatedChats = state.chats.map(chat => {
                if (chat.id !== currentChatId) return chat

                // Refresh messages inside that chat
                const updatedChatMessages = chat.messages.map(m =>
                  m.id === messageId ? { ...m, content: newContent } : m
                )

                // If the first message changed, refresh the title
                const newTitle =
                  chat.messages.length &&
                  chat.messages[0].id === messageId
                    ? generateChatTitle(newContent)
                    : chat.title

                return {
                  ...chat,
                  messages: updatedChatMessages,
                  title: newTitle,
                  updatedAt: new Date().toISOString(),
                }
              })

              return { messages: updatedMessages, chats: updatedChats }
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
            
            // preserve the preferred model
            const preferredModel = localStorage.getItem('openai_preferred_model') || 'gpt-4o-mini'
            const defaultReasoningEffort = get().getDefaultReasoningEffort(preferredModel)

            // ➜ keep voiceMode if the preferred model is realtime, otherwise reset to "none"
            const shouldKeepVoice =
              REALTIME_MODELS.some(rm => rm.id === preferredModel)

            set({
              currentChatId: null,
              messages: [],
              error: null,
              unsupportedModelError: null,
              selectedModel: preferredModel,
              reasoningEffort: defaultReasoningEffort,
              voiceMode: shouldKeepVoice ? 'text-to-voice' : 'none',
              isVoiceSessionEnded: false,
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
                voiceMode: chatToLoad.voiceMode || 'none',
                isVoiceSessionEnded: chatToLoad.isVoiceSessionEnded || false,
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
                  isVoiceSessionEnded: false,
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

          sendMessage: async (content: string, images?: Array<{ url: string; file: File }>) => {
            const apiKey = localStorage.getItem('openai_api_key')
            let model = get().selectedModel
            const reasoningEffort = get().reasoningEffort
            const devMode = get().devMode
            const systemInstructions = get().systemInstructions
            
            if (!apiKey) {
              set({ error: 'Please set your OpenAI API key in settings' })
              return
            }

            // If the current model is a realtime model, we can't use it for a standard chat message.
            // This happens when a user ends a voice session and then continues to chat via text.
            // We'll fall back to a default chat model for this message.
            if (get().isRealtimeModel(model)) {
              model = 'gpt-4o-mini'
            }

            // Clear previous errors
            set({ error: null, unsupportedModelError: null })

            // Prepare messages for API
            const currentMessages = get().messages
            const messagesToSend = []
            
            // Add system instructions - use default if none provided
            const instructions = systemInstructions.trim() || 'You are a helpful assistant.'
            messagesToSend.push({
              role: 'system',
              content: instructions
            })
            
            // Add existing messages
            messagesToSend.push(
              ...currentMessages.map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.content,
              }))
            )
            
            // Prepare user message with images if present
            let userMessageContent: string | MessageContent[] = content
            if (images && images.length > 0) {
              const contentArray: MessageContent[] = []
              if (content) {
                contentArray.push({ type: 'text', text: content })
              }
              images.forEach(img => {
                contentArray.push({
                  type: 'image_url',
                  image_url: { url: img.url, detail: 'auto' }
                })
              })
              userMessageContent = contentArray
            }
            
            messagesToSend.push({ role: 'user', content: userMessageContent })

            // Debug info for user message
            const userDebugInfo = devMode ? {
              sentToAPI: {
                model,
                messages: messagesToSend,
                temperature: get().temperature,
                max_tokens: model.includes('o3') || model.includes('o4') ? undefined : get().maxTokens,
                max_completion_tokens: model.includes('o3') || model.includes('o4') ? get().maxTokens : undefined,
                reasoning_effort: reasoningEffort !== 'no-reasoning' ? reasoningEffort : undefined,
                timestamp: new Date().toISOString(),
                stream: true,
              }
            } : undefined

            // Add user message with debug info
            get().addMessage(userMessageContent, true, userDebugInfo)
            
            // Mark chat as having images if necessary
            if (images && images.length > 0) {
              set(state => ({
                chats: state.chats.map(chat => 
                  chat.id === state.currentChatId 
                    ? { ...chat, hasImages: true }
                    : chat
                )
              }))
            }
            
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
                  temperature: get().temperature,
                  maxTokens: get().maxTokens,
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

          sendImageMessage: async (prompt: string, images?: Array<{ url: string; file: File }>) => {
            const apiKey = localStorage.getItem('openai_api_key')
            const model = get().selectedModel
            const apiModel = get().getApiModelId(model) // Map internal ID to API ID
            const imageQuality = get().imageQuality
            const imageStreaming = get().imageStreaming
            const imageAspectRatio = get().imageAspectRatio
            const devMode = get().devMode
            const currentChatMessages = get().messages
            
            if (!apiKey) {
              set({ error: 'Please set your OpenAI API key in settings' })
              return
            }

            // Only allow image generation for image models
            if (!get().isImageModel(model)) {
              set({ error: 'Current model does not support image generation' })
              return
            }

            // Clear previous errors
            set({ error: null, unsupportedModelError: null })

            // Create message content with text and images
            const messageContent: MessageContent[] = [
              {
                type: 'text',
                text: prompt,
              }
            ]

            // Add uploaded images to message content
            if (images && images.length > 0) {
              console.log('🎬 [IMAGE GENERATION] Adding', images.length, 'uploaded images to user message')
              images.forEach((image, index) => {
                console.log(`🎬 [IMAGE GENERATION] Adding image ${index + 1}:`, image.url.substring(0, 50) + '...')
                messageContent.push({
                  type: 'image_url',
                  image_url: {
                    url: image.url,
                    detail: 'high'
                  }
                })
              })
            }

            // Debug info for user message
            const userDebugInfo = devMode ? {
              sentToAPI: {
                model: apiModel, // Show the actual API model in debug info
                prompt,
                quality: imageQuality,
                streaming: imageStreaming,
                aspectRatio: imageAspectRatio,
                hasImages: !!(images && images.length > 0),
                timestamp: new Date().toISOString(),
              }
            } : undefined

            // Add user message with debug info (use array content if images, otherwise string)
            const userContent = messageContent.length > 1 ? messageContent : prompt
            get().addMessage(userContent, true, userDebugInfo)
            
            // Get the current chat ID after adding message (in case a new chat was created)
            const chatId = get().currentChatId
            if (!chatId) return

                                      // Create unique placeholder ID for this specific image generation
            const placeholderTimestamp = Date.now()
            const placeholderId = `${placeholderTimestamp}_ai_image_${Math.random().toString(36).substr(2, 9)}`
            
            // Create streaming session for this chat (for both streaming and final-only modes)
            get().createStreamingSession(chatId)
            
            // Store the placeholder ID in the streaming session
            get().updateStreamingSession(chatId, { placeholderId })
            
            // Add placeholder AI message with progress indicator for streaming
            const placeholderMessage: Message = {
              id: placeholderId,
              content: imageStreaming === 'enabled' ? 'Starting image generation...' : '',
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
                // Don't set global isLoading, use streaming session instead
              }
            })

            const startTime = Date.now()

            try {
              const controller = new AbortController()
              // Always set the abort controller for both streaming and final-only modes
              get().updateStreamingSession(chatId, { abortController: controller })

              // Prepare messages for multi-turn (include previous context if available)
              const messagesForAPI = []
              
              // Add previous messages for multi-turn context
              if (currentChatMessages.length > 1) {
                console.log('🎬 [IMAGE GENERATION] Adding', currentChatMessages.length - 1, 'previous messages for context')
                console.log('🎬 [IMAGE GENERATION] Previous messages preview:', currentChatMessages.slice(0, -1).map((m, i) => ({ 
                  index: i,
                  isUser: m.isUser, 
                  contentType: typeof m.content, 
                  isArray: Array.isArray(m.content),
                  hasImageUrl: Array.isArray(m.content) && m.content.some(item => item.type === 'image_url'),
                  preview: typeof m.content === 'string' ? m.content.slice(0, 100) : `[${Array.isArray(m.content) ? m.content.length : 'unknown'} items]`
                })))
                
                // Convert messages to API format, excluding the just-added user message
                for (let i = 0; i < currentChatMessages.length - 1; i++) {
                  const msg = currentChatMessages[i]
                  console.log(`🎬 [IMAGE GENERATION] Processing message ${i + 1}:`, {
                    isUser: msg.isUser,
                    contentType: typeof msg.content,
                    isArray: Array.isArray(msg.content),
                    content: Array.isArray(msg.content) ? msg.content.map(item => ({ type: item.type, hasUrl: !!item.image_url?.url })) : 'string'
                  })
                  
                  // Convert content format for API compatibility
                  let apiContent: any = msg.content
                  if (Array.isArray(msg.content)) {
                    apiContent = msg.content.map(item => {
                      if (item.type === 'text') {
                        // Convert 'text' to 'input_text' for API compatibility
                        return {
                          type: 'input_text',
                          text: item.text
                        }
                      } else if (item.type === 'image_url') {
                        // Convert image_url to input_image for API compatibility
                        console.log(`🎬 [IMAGE GENERATION] Converting image_url to input_image:`, { url: item.image_url?.url?.slice(0, 50) + '...' })
                        return {
                          type: 'input_image',
                          image_url: item.image_url?.url
                        }
                      }
                      return item
                    })
                  } else if (!msg.isUser && msg.imageGenerationId) {
                    // This is a generated image message - use the image generation ID for multi-turn
                    console.log(`🎬 [IMAGE GENERATION] Found generated image with ID in assistant message ${i + 1}:`, msg.imageGenerationId)
                    apiContent = {
                      type: 'image_generation_call',
                      id: msg.imageGenerationId
                    }
                  } else if (typeof msg.content === 'string') {
                    // String message (user or assistant text)
                    apiContent = [{
                      type: 'input_text',
                      text: msg.content
                    }]
                  } else {
                    // Fallback for other content types
                    apiContent = [{
                      type: 'input_text',
                      text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                    }]
                  }
                  
                  // Handle image_generation_call differently - it goes directly in the input array
                  if (!msg.isUser && msg.imageGenerationId) {
                    // Image generation call goes directly in the input, not wrapped in role/content
                    messagesForAPI.push(apiContent)
                    console.log(`🎬 [IMAGE GENERATION] Added image generation call ${i + 1}:`, apiContent)
                  } else {
                    // Regular message with role/content structure
                    messagesForAPI.push({
                      role: msg.isUser ? 'user' : 'assistant',
                      content: apiContent
                    })
                    console.log(`🎬 [IMAGE GENERATION] Added message ${i + 1}:`, msg.isUser ? 'user' : 'assistant', Array.isArray(apiContent) ? `[${apiContent.length} items]` : typeof apiContent)
                  }
                }
              }

              // Convert current user message content for API compatibility
              let apiUserContent: any = userContent
              if (Array.isArray(userContent)) {
                apiUserContent = userContent.map(item => {
                  if (item.type === 'text') {
                    return {
                      type: 'input_text',
                      text: item.text
                    }
                  } else if (item.type === 'image_url') {
                    return {
                      type: 'input_image',
                      image_url: item.image_url?.url
                    }
                  }
                  return item
                })
              } else if (typeof userContent === 'string') {
                // Convert string to proper format
                apiUserContent = [{
                  type: 'input_text',
                  text: userContent
                }]
              }

              // Add current user message
              messagesForAPI.push({
                role: 'user',
                content: apiUserContent
              })
              
              console.log('🎬 [IMAGE GENERATION] Final API messages count:', messagesForAPI.length)
              console.log('🎬 [IMAGE GENERATION] Current user message content type:', Array.isArray(apiUserContent) ? `array with ${apiUserContent.length} items` : 'string')
              console.log('🎬 [IMAGE GENERATION] Complete API messages structure:', messagesForAPI.map((msg, i) => ({
                index: i,
                role: msg.role,
                contentItems: Array.isArray(msg.content) ? msg.content.length : 1,
                contentTypes: Array.isArray(msg.content) ? msg.content.map((c: any) => c.type) : [typeof msg.content]
              })))

              const response = await fetch('/api/image-generation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  prompt,
                  apiKey,
                  model: apiModel, // Use the mapped API model ID
                  quality: imageQuality,
                  streaming: imageStreaming,
                  aspectRatio: imageAspectRatio,
                  messages: messagesForAPI, // Send full conversation context
                  inputImages: images?.map(img => img.url) || [], // Send uploaded images
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
                  // Always cleanup streaming session on error for both modes
                  get().cleanupStreamingSession(chatId)
                  return
                }
                throw new Error(errorData.error || 'Failed to generate image')
              }

              // Handle streaming response
              if (imageStreaming === 'enabled' && response.body) {
                get().updateStreamingSession(chatId, { isStreaming: true })
                // Don't set global isLoading to false, use streaming session state
                
                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let finalImageData = ''
                let buffer = '' // Buffer to accumulate incomplete JSON chunks
                const responseTime = Date.now() - startTime
                let partialCount = 0
                let finalMessageProcessed = false

                console.log('🎬 [IMAGE STREAMING] Starting image stream processing...')

                try {
                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) {
                      console.log('🎬 [IMAGE STREAMING] Stream completed')
                      break
                    }
                    
                    const chunk = decoder.decode(value, { stream: true })
                    console.log('🎬 [IMAGE STREAMING] Received chunk length:', chunk.length)
                    
                    // Add chunk to buffer
                    buffer += chunk
                    
                    // Process complete lines from buffer
                    const lines = buffer.split('\n')
                    
                    // Keep the last line in buffer in case it's incomplete
                    buffer = lines.pop() || ''
                    
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim()
                        if (data === '[DONE]') {
                          console.log('🎬 [IMAGE STREAMING] Received [DONE] signal')
                          break
                        }
                        
                        if (data === '') continue // Skip empty data lines
                        
                        try {
                          console.log('🎬 [IMAGE STREAMING] Parsing JSON data of length:', data.length)
                          const parsed = JSON.parse(data)
                          console.log('🎬 [IMAGE STREAMING] Parsed event type:', parsed.type, 'progress:', parsed.progress)
                          
                          if (parsed.type === 'partial_image') {
                            partialCount++
                            console.log(`🎬 [IMAGE STREAMING] Processing partial image #${partialCount} (${parsed.progress}%)`)
                            console.log('🎬 [IMAGE STREAMING] Image generation ID from partial:', parsed.imageGenerationId)
                            
                            // Always store the latest image as potential final image
                            finalImageData = parsed.image
                            console.log('🎬 [IMAGE STREAMING] Updated finalImageData with latest partial image')
                            
                            // If progress is 100% or this is the highest progress we've seen, treat as final
                            if (parsed.progress >= 67) { // 67% is typically the last partial image
                              console.log('🎬 [IMAGE STREAMING] This appears to be the final image (progress >= 67%)')
                            }
                            
                            // Store partial image in persistent cache
                            const partialImageId = `partial_img_${Date.now()}_${partialCount}`
                            // Store in IndexedDB asynchronously (don't block UI)
                            storeImage(partialImageId, parsed.image).catch(console.error)
                            
                            // Show partial image during generation
                            const partialImageContent: MessageContent[] = [
                              {
                                type: 'text',
                                text: `Generating image... (${parsed.progress}%)`
                              },
                              {
                                type: 'image_url',
                                image_url: {
                                  url: `cache:${partialImageId}`,
                                  detail: 'auto'
                                }
                              }
                            ]
                            
                            console.log('🎬 [IMAGE STREAMING] Updating UI with partial image')
                            
                            // Update placeholder message with partial image (optimized to avoid reloads)
                            set(state => {
                              // Get the specific placeholder ID for this image generation
                              const currentSession = state.streamingSessions.get(chatId)
                              const targetPlaceholderId = currentSession?.placeholderId
                              
                              if (!targetPlaceholderId) {
                                console.warn('🎬 [IMAGE STREAMING] No placeholder ID found in session')
                                return state
                              }
                              
                              // Find the specific placeholder message by its unique ID
                              const placeholderIndex = state.messages.findIndex(msg => msg.id === targetPlaceholderId)
                              
                              if (placeholderIndex === -1) {
                                console.warn('🎬 [IMAGE STREAMING] Placeholder message not found:', targetPlaceholderId)
                                return state
                              }
                              
                              // Only update the specific message, don't recreate arrays
                              const updatedMessages = [...state.messages]
                              updatedMessages[placeholderIndex] = { 
                                ...updatedMessages[placeholderIndex], 
                                content: partialImageContent 
                              }
                              
                              // Only update current chat if this is the current chat
                              if (state.currentChatId === chatId) {
                                // Also update in chats array for persistence
                                const updatedChats = state.chats.map(chat => {
                                  if (chat.id === chatId) {
                                    const chatMessages = [...chat.messages]
                                    const chatPlaceholderIndex = chatMessages.findIndex(msg => msg.id === targetPlaceholderId)
                                    if (chatPlaceholderIndex !== -1) {
                                      chatMessages[chatPlaceholderIndex] = { 
                                        ...chatMessages[chatPlaceholderIndex], 
                                        content: partialImageContent 
                                      }
                                    }
                                    return { ...chat, messages: chatMessages, updatedAt: new Date().toISOString() }
                                  }
                                  return chat
                                })
                                
                                return { messages: updatedMessages, chats: updatedChats }
                              }
                              
                              return state // No changes if not current chat
                            })
                          } else if (parsed.type === 'complete') {
                            console.log('🎬 [IMAGE STREAMING] Received final image, replacing with final message')
                            console.log('🎬 [IMAGE STREAMING] Image generation ID from complete:', parsed.imageGenerationId)
                            finalImageData = parsed.image
                            
                            // Immediately update with final image to avoid double replacement
                            if (finalImageData) {
                              const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                              
                              // Store final image in cache
                              storeImage(imageId, finalImageData).catch(console.error)
                              
                              const finalImageContent: MessageContent[] = [
                                {
                                  type: 'text',
                                  text: `Generated image for: "${prompt}"`
                                },
                                {
                                  type: 'image_url',
                                  image_url: {
                                    url: `cache:${imageId}`,
                                    detail: 'auto'
                                  }
                                }
                              ]
                              
                              console.log('🎬 [IMAGE STREAMING] Replacing placeholder with final message')
                              
                              // Replace placeholder message with final image and save image generation ID
                              set(state => {
                                // Get the specific placeholder ID for this image generation
                                const currentSession = state.streamingSessions.get(chatId)
                                const targetPlaceholderId = currentSession?.placeholderId
                                
                                if (!targetPlaceholderId) {
                                  console.warn('🎬 [IMAGE STREAMING] No placeholder ID found in session for final image')
                                  return state
                                }
                                
                                const updatedMessages = state.messages.map(msg => {
                                  if (msg.id === targetPlaceholderId) {
                                    return { 
                                      ...msg, 
                                      content: finalImageContent,
                                      imageGenerationId: parsed.imageGenerationId // Store the image generation ID
                                    }
                                  }
                                  return msg
                                })
                                
                                const updatedChats = state.chats.map(chat => {
                                  if (chat.id === chatId) {
                                    const chatMessages = chat.messages.map(msg => {
                                      if (msg.id === targetPlaceholderId) {
                                        return { 
                                          ...msg, 
                                          content: finalImageContent,
                                          imageGenerationId: parsed.imageGenerationId // Store the image generation ID
                                        }
                                      }
                                      return msg
                                    })
                                    return { ...chat, messages: chatMessages, updatedAt: new Date().toISOString() }
                                  }
                                  return chat
                                })
                                
                                if (state.currentChatId === chatId) {
                                  return { messages: updatedMessages, chats: updatedChats }
                                }
                                
                                return { chats: updatedChats }
                              })
                              
                              // Clean up streaming session since we're done
                              get().cleanupStreamingSession(chatId)
                              finalMessageProcessed = true
                              return // Exit early to avoid processing at the end
                            }
                          } else if (parsed.type === 'error') {
                            console.error('🎬 [IMAGE STREAMING] Received error:', parsed.error)
                            throw new Error(parsed.error)
                          }
                        } catch (e: any) {
                          if (e.message.includes('Unexpected end of JSON input') || e.message.includes('Unterminated string')) {
                            console.log('🎬 [IMAGE STREAMING] JSON chunk incomplete, waiting for more data...')
                            // Put the incomplete data back in buffer
                            buffer = 'data: ' + data + '\n' + buffer
                          } else {
                            console.error('🎬 [IMAGE STREAMING] JSON parse error:', e.message)
                            console.error('🎬 [IMAGE STREAMING] Problematic data (first 200 chars):', data.substring(0, 200))
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

                // Check if we have image data (and haven't already processed the final message)
                if (finalMessageProcessed) {
                  console.log('🎬 [IMAGE STREAMING] Final message already processed, skipping end processing')
                  return
                }
                
                if (!finalImageData || finalImageData.length === 0) {
                  console.log('🎬 [IMAGE STREAMING] No image data received, showing informative message')
                  
                  // Create content with informative message instead of image
                  const imageContent: MessageContent[] = [
                    {
                      type: 'text',
                      text: `No image could be generated for: "${prompt}". The model did not return any image.`
                    }
                  ]

                  // Debug info for assistant response
                  const assistantDebugInfo = devMode ? {
                    receivedFromAPI: {
                      model,
                      response: 'No image generated',
                      timestamp: new Date().toISOString(),
                      responseTime,
                    }
                  } : undefined

                  // Finalize the message with informative text
                  set(state => {
                    const finalMessage = {
                      id: Date.now().toString(),
                      content: imageContent,
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
                        const updatedMessages = chat.messages.map((msg, idx) => {
                          if (idx === chat.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')) {
                            return finalMessage
                          }
                          return msg
                        })
                        return { ...chat, messages: updatedMessages, updatedAt: new Date().toISOString() }
                      }
                      return chat
                    })
                    
                    // If this is the current chat, also update the current messages
                    if (state.currentChatId === chatId) {
                      const updatedMessages = state.messages.map((msg, idx) => {
                        if (idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')) {
                          return finalMessage
                        }
                        return msg
                      })
                      return { messages: updatedMessages, chats: updatedChats }
                    }
                    
                    return { chats: updatedChats }
                  })
                  
                  // Clean up streaming session
                  get().cleanupStreamingSession(chatId)
                  return
                }

                // Store image in persistent cache
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                
                // Store in IndexedDB asynchronously (don't block UI)
                storeImage(imageId, finalImageData).catch(console.error)
                
                // Create image content with reference to cached image
                const imageContent: MessageContent[] = [
                  {
                    type: 'text',
                    text: `Generated image for: "${prompt}"`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `cache:${imageId}`, // Reference to cached image
                      detail: 'auto'
                    }
                  }
                ]

                // Debug info for assistant response
                const assistantDebugInfo = devMode ? {
                  receivedFromAPI: {
                    model: apiModel, // Show the actual API model in debug info
                    response: 'Image generated successfully',
                    timestamp: new Date().toISOString(),
                    responseTime,
                  }
                } : undefined

                // Finalize the message with image
                console.log('🎬 [IMAGE STREAMING] Finalizing message with complete image')
                console.log('🎬 [IMAGE STREAMING] Final image data length:', finalImageData.length)
                
                set(state => {
                  const finalMessage = {
                    id: Date.now().toString(),
                    content: imageContent,
                    isUser: false,
                    timestamp: new Date().toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }),
                    debugInfo: assistantDebugInfo,
                  }
                  
                  console.log('🎬 [IMAGE STREAMING] Creating final message with content length:', imageContent.length)
                  
                  // Update chats array
                  const updatedChats = state.chats.map(chat => {
                    if (chat.id === chatId) {
                      const updatedMessages = chat.messages.map((msg, idx) => {
                        if (idx === chat.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')) {
                          console.log('🎬 [IMAGE STREAMING] Replacing placeholder with final message')
                          return finalMessage
                        }
                        return msg
                      })
                      return { ...chat, messages: updatedMessages, updatedAt: new Date().toISOString() }
                    }
                    return chat
                  })
                  
                  // If this is the current chat, also update the current messages
                  if (state.currentChatId === chatId) {
                    const updatedMessages = state.messages.map((msg, idx) => {
                      if (idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')) {
                        console.log('🎬 [IMAGE STREAMING] Replacing current message with final message')
                        return finalMessage
                      }
                      return msg
                    })
                    return { messages: updatedMessages, chats: updatedChats }
                  }
                  
                  return { chats: updatedChats }
                })
                
                // Clean up streaming session
                get().cleanupStreamingSession(chatId)
                
              } else {
                // Non-streaming response (Final only mode)
                const imageData = await response.json()
                const responseTime = Date.now() - startTime

                // Check if we have image data
                if (!imageData.image || imageData.image.length === 0) {
                  console.log('🎬 [IMAGE FINAL-ONLY] No image data received, showing informative message')
                  
                  // Create content with informative message instead of image
                  const imageContent: MessageContent[] = [
                    {
                      type: 'text',
                      text: `No image could be generated for: "${prompt}". The model did not return any image.`
                    }
                  ]

                  // Debug info for assistant response
                  const assistantDebugInfo = devMode ? {
                    receivedFromAPI: {
                      model: apiModel, // Show the actual API model in debug info
                      response: 'No image generated',
                      timestamp: new Date().toISOString(),
                      responseTime,
                    }
                  } : undefined

                  // Update the placeholder message with informative text
                  set(state => {
                    const finalMessage = {
                      id: Date.now().toString(),
                      content: imageContent,
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
                          idx === chat.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')
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
                        idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')
                          ? finalMessage
                          : msg
                      )
                      return { messages: updatedMessages, chats: updatedChats }
                    }
                    
                    return { chats: updatedChats }
                  })
                  
                  // Clean up streaming session for final-only mode too
                  get().cleanupStreamingSession(chatId)
                  return
                }

                // Store image in persistent cache
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                
                // Store in IndexedDB asynchronously (don't block UI)
                storeImage(imageId, imageData.image).catch(console.error)
                
                // Create image content
                const imageContent: MessageContent[] = [
                  {
                    type: 'text',
                    text: `Generated image for: "${prompt}"`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `cache:${imageId}`,
                      detail: 'auto'
                    }
                  }
                ]

                // Debug info for assistant response
                const assistantDebugInfo = devMode ? {
                  receivedFromAPI: {
                    model: apiModel, // Show the actual API model in debug info
                    response: 'Image generated successfully',
                    timestamp: new Date().toISOString(),
                    responseTime,
                  }
                } : undefined

                // Update the placeholder message with the image
                set(state => {
                  const finalMessage = {
                    id: Date.now().toString(),
                    content: imageContent,
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
                        idx === chat.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')
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
                      idx === state.messages.length - 1 && !msg.isUser && msg.id.endsWith('_ai_image')
                        ? finalMessage
                        : msg
                    )
                    return { messages: updatedMessages, chats: updatedChats }
                  }
                  
                  return { chats: updatedChats }
                })
                
                // Clean up streaming session for final-only mode too
                get().cleanupStreamingSession(chatId)
              }
            } catch (error: any) {
              console.error('Image generation error:', error)
              if (error.name !== 'AbortError') {
                // Only set error if we're still on the same chat
                if (get().currentChatId === chatId) {
                  set({ 
                    error: error?.message || 'An error occurred while generating the image',
                  })
                }
                // Always cleanup streaming session on error for both modes
                get().cleanupStreamingSession(chatId)
              }
            } finally {
              // Don't set global isLoading to false, streaming session cleanup handles this
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

          setVoiceMode: (mode: VoiceMode) => {
            set({ voiceMode: mode })
            
            // Update voice mode for current chat if there is one
            const { currentChatId, chats } = get()
            if (currentChatId) {
              const currentChat = chats.find(c => c.id === currentChatId)
              // Only update if voice mode has actually changed to avoid unnecessary re-renders
              if (currentChat && currentChat.voiceMode !== mode) {
                set(state => ({
                  chats: state.chats.map(chat =>
                    chat.id === currentChatId ? { 
                      ...chat, 
                      voiceMode: mode
                    } : chat
                  ),
                }))
              }
            }
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

          isRealtimeModel: (modelId?: string) => {
            const model = modelId || get().selectedModel
            return REALTIME_MODELS.some(rm => rm.id === model)
          },

          isVisionModel: (modelId?: string) => {
            const model = modelId || get().selectedModel
            return VISION_MODELS.some(vm => model.includes(vm))
          },

          chatHasImages: (chatId?: string) => {
            const targetChatId = chatId || get().currentChatId
            if (!targetChatId) return false
            
            const chat = get().chats.find(c => c.id === targetChatId)
            if (!chat) return false
            
            return chat.hasImages || false
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

          setVoiceSessionEnded: (ended: boolean) => {
            set({ isVoiceSessionEnded: ended })
            
            // Update for current chat if there is one
            const { currentChatId, chats } = get()
            if (currentChatId) {
              const currentChat = chats.find(c => c.id === currentChatId)
              if (currentChat && currentChat.isVoiceSessionEnded !== ended) {
                set(state => ({
                  chats: state.chats.map(chat =>
                    chat.id === currentChatId ? { ...chat, isVoiceSessionEnded: ended } : chat
                  ),
                }))
              }
            }
          },

          setTemperature: (temperature: number) => {
            set({ temperature })
            localStorage.setItem('openai_temperature', temperature.toString())
          },

          setMaxTokens: (maxTokens: number) => {
            set({ maxTokens })
            localStorage.setItem('openai_max_tokens', maxTokens.toString())
          },

          setVoice: (voice: string) => {
            set({ voice })
            localStorage.setItem('openai_voice', voice)
          },

          setSystemInstructions: (systemInstructions: string) => {
            set({ systemInstructions })
            localStorage.setItem('openai_system_instructions', systemInstructions)
          },

          setVadType: (vadType: 'server_vad' | 'semantic_vad') => {
            set({ vadType })
            localStorage.setItem('openai_vad_type', vadType)
          },

          setVadThreshold: (vadThreshold: number) => {
            set({ vadThreshold })
            localStorage.setItem('openai_vad_threshold', vadThreshold.toString())
          },

          setVadPrefixPadding: (vadPrefixPadding: number) => {
            set({ vadPrefixPadding })
            localStorage.setItem('openai_vad_prefix_padding', vadPrefixPadding.toString())
          },

          setVadSilenceDuration: (vadSilenceDuration: number) => {
            set({ vadSilenceDuration })
            localStorage.setItem('openai_vad_silence_duration', vadSilenceDuration.toString())
          },

          setVadEagerness: (vadEagerness: 'low' | 'medium' | 'high' | 'auto') => {
            set({ vadEagerness })
            localStorage.setItem('openai_vad_eagerness', vadEagerness)
          },

          setTranscriptionModel: (transcriptionModel: string) => {
            set({ transcriptionModel })
            localStorage.setItem('openai_transcription_model', transcriptionModel)
          },

          setTranscriptionLanguage: (transcriptionLanguage: string) => {
            set({ transcriptionLanguage })
            localStorage.setItem('openai_transcription_language', transcriptionLanguage)
          },

          // NEW: Image generation actions
          setImageQuality: (quality: ImageQuality) => {
            set({ imageQuality: quality })
          },

          setImageStreaming: (streaming: ImageStreaming) => {
            set({ imageStreaming: streaming })
          },

          setImageAspectRatio: (aspectRatio: ImageAspectRatio) => {
            set({ imageAspectRatio: aspectRatio })
          },

          // NEW: Helper to check if model is image generation model
          isImageModel: (modelId?: string) => {
            const model = modelId || get().selectedModel
            return IMAGE_MODELS.includes(model)
          },

          // NEW: Get the actual API model ID from internal ID
          getApiModelId: (modelId: string) => {
            return IMAGE_MODEL_MAP[modelId] || modelId
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
          voiceMode: state.voiceMode,
          devMode: state.devMode,
          temperature: state.temperature,
          maxTokens: state.maxTokens,
          voice: state.voice,
          systemInstructions: state.systemInstructions,
          vadType: state.vadType,
          vadThreshold: state.vadThreshold,
          vadPrefixPadding: state.vadPrefixPadding,
          vadSilenceDuration: state.vadSilenceDuration,
          vadEagerness: state.vadEagerness,
          transcriptionModel: state.transcriptionModel,
          transcriptionLanguage: state.transcriptionLanguage,
        }),
        version: 5,
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
          if (version < 4) {
            if (persistedState) {
              persistedState.voiceMode = 'none'
              if (persistedState.chats) {
                persistedState.chats = persistedState.chats.map((chat: any) => ({
                  ...chat,
                  voiceMode: 'none',
                }))
              }
            }
          }
          if (version < 5) {
            if (persistedState) {
              if (persistedState.chats) {
                persistedState.chats = persistedState.chats.map((chat: any) => ({
                  ...chat,
                  isVoiceSessionEnded: false,
                }))
              }
            }
          }
          return persistedState
        },
      }
    ),
    { name: 'chat-store' }
  )
)