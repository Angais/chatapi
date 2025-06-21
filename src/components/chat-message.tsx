'use client'

import { motion } from 'framer-motion'
import { Copy, Info, Check, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Highlight, themes } from 'prism-react-renderer'
import { useTheme } from '@/hooks/use-theme'
import { useChatStore } from '@/stores/chat-store'
import { DevInfoModal } from '@/components/dev-info-modal'
import ReactMarkdown from 'react-markdown'
import { useEffect, useState, useRef } from 'react'
import { Message } from '@/stores/chat-store'

interface ChatMessageProps {
  content: string
  isUser: boolean
  timestamp?: string
  message?: Message
  isStreaming?: boolean
}

// Componente para el cursor parpadeante
function StreamingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "linear"
      }}
      className="inline-block w-2 h-5 bg-foreground ml-0.5 -mb-1"
    />
  )
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const { actualTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const [showCopyButton, setShowCopyButton] = useState(false)
  const language = className?.replace('language-', '') || 'text'
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleCodeBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCopyButton(true)
  }

  useEffect(() => {
    const handleClickOutside = () => {
      setShowCopyButton(false)
    }

    if (showCopyButton) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showCopyButton])

  // Render a simple code block on server and during hydration
  if (!isClient) {
    return (
      <div className="relative group/codeblock cursor-pointer" onClick={handleCodeBlockClick}>
        <div className="max-h-[600px] overflow-auto rounded-lg custom-scrollbar">
          <pre className="p-6 text-sm font-mono whitespace-pre bg-muted rounded-lg w-max min-w-full">
            <code>{children.trim()}</code>
          </pre>
        </div>
        <div className={`absolute top-2 right-2 transition-opacity duration-200 ${
          showCopyButton ? 'opacity-100' : 'opacity-0 group-hover/codeblock:opacity-100'
        }`}>
          <CopyButton
            content={children}
            className="h-8 w-8 p-0"
            disabled={false}
          />
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative group/codeblock cursor-pointer" onClick={handleCodeBlockClick}>
      <div className="max-h-[600px] overflow-auto rounded-lg custom-scrollbar">
        <Highlight 
          theme={actualTheme === 'dark' ? themes.vsDark : themes.vsLight} 
          code={children.trim()} 
          language={language as any}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={`${className} p-6 text-sm whitespace-pre w-max min-w-full rounded-lg`} 
              style={style}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
      <div className={`absolute top-2 right-2 transition-opacity duration-200 ${
        showCopyButton ? 'opacity-100' : 'opacity-0 group-hover/codeblock:opacity-100'
      }`}>
        <CopyButton
          content={children}
          className="h-8 w-8 p-0"
          disabled={false}
        />
      </div>
    </div>
  )
}

// Componente CopyButton con animación real
function CopyButton({ 
  content, 
  className = "",
  disabled = false
}: { 
  content: string
  className?: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Button
        variant="ghost"
        size="sm"
        className={`${className} cursor-pointer`}
        onClick={handleCopy}
        disabled={disabled}
      >
        <motion.div
          initial={false}
          animate={{ 
            scale: copied ? [1, 1.2, 1] : 1,
            rotate: copied ? [0, 10, -10, 0] : 0
          }}
          transition={{ duration: 0.3 }}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </motion.div>
      </Button>
    </motion.div>
  )
}

export function ChatMessage({ content, isUser, timestamp, message, isStreaming = false }: ChatMessageProps) {
  const [showCopyButton, setShowCopyButton] = useState(false)
  const [showDevModal, setShowDevModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const { devMode, updateMessage } = useChatStore()

  // Keep local draft in sync
  useEffect(() => {
    if (!isEditing) setEditedContent(content)
  }, [content, isEditing])

  const handleMessageClick = (e: React.MouseEvent) => {
    if (isUser) {
      e.stopPropagation()
      setShowCopyButton(true)
    }
  }

  useEffect(() => {
    const handleClickOutside = () => {
      setShowCopyButton(false)
    }

    if (showCopyButton) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showCopyButton])

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group w-full py-4"
      >
        {/* Responsive container matching input width */}
        <div className="w-full max-w-4xl mx-auto px-4">
          <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`w-full ${isUser ? 'max-w-[85%] sm:max-w-[75%] flex flex-col items-end' : 'flex flex-col items-start'}`}>
              {/* Message */}
              <div
                onClick={handleMessageClick}
                className={`relative px-4 py-3 rounded-2xl text-base leading-relaxed ${
                  isUser
                    ? 'w-fit max-w-full bg-card text-card-foreground rounded-br-md cursor-pointer'
                    : 'w-full bg-transparent text-foreground'
                } break-words`}
              >
                <div className="space-y-3">
                  {isUser ? (
                    isEditing ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full bg-transparent outline-none resize-none"
                        rows={Math.min(6, editedContent.split('\n').length)}
                        autoFocus
                      />
                    ) : (
                      <span className="whitespace-pre-wrap break-words" data-message-content>{content}</span>
                    )
                  ) : (
                    <div className="w-full" data-message-content>
                      {isStreaming ? (
                        // Para streaming, renderizar como texto plano con cursor al final
                        <div className="whitespace-pre-wrap break-words">
                          {content}
                          <StreamingCursor />
                        </div>
                      ) : (
                        // Para mensajes completos, usar ReactMarkdown
                        <div className="markdown-content">
                          <ReactMarkdown
                            components={{
                              code: ({ node, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return match ? (
                                  <CodeBlock className={className}>
                                    {String(children).replace(/\n$/, '')}
                                  </CodeBlock>
                                ) : (
                                  <code 
                                    className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-all"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                )
                              },
                              pre: ({ children }) => <>{children}</>,
                              h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 ml-4">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 ml-4">{children}</ol>,
                              li: ({ children }) => <li className="text-base">{children}</li>,
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-muted pl-4 italic">{children}</blockquote>
                              ),
                            }}
                          >
                            {content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions for AI messages - always reserve space */}
              {!isUser && (
                <div className={`flex items-center gap-1 mt-2 h-7 transition-all duration-200 ${
                  isStreaming || !content.trim() ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}>
                  <CopyButton
                    content={content}
                    className={`h-7 px-2 text-xs`}
                    disabled={isStreaming || !content.trim()}
                  />
                  {devMode && message && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs cursor-pointer"
                      onClick={() => setShowDevModal(true)}
                      title="Development information"
                      disabled={isStreaming || !content.trim()}
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Actions for user messages */}
              {isUser && (
                <div className={`flex items-center gap-1 mt-2 transition-opacity duration-300 ease-out ${
                  showCopyButton || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {!isEditing && (
                    <>
                      <CopyButton
                        content={content}
                        className="h-7 px-2 text-xs"
                        disabled={false}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
                        title="Edit message"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditedContent(content) }}
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          const trimmed = editedContent.trim()
                          if (trimmed && message) updateMessage(message.id, trimmed)
                          setIsEditing(false)
                        }}
                        title="Save"
                        disabled={editedContent.trim() === content.trim()}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {devMode && message && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDevModal(true)
                      }}
                      title="Development information"
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Dev Info Modal */}
      {message && (
        <DevInfoModal
          message={message}
          open={showDevModal}
          onOpenChange={setShowDevModal}
        />
      )}
    </>
  )
} 