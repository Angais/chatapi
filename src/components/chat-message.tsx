'use client'

import { motion } from 'framer-motion'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Highlight, themes } from 'prism-react-renderer'
import { useTheme } from '@/hooks/use-theme'
import ReactMarkdown from 'react-markdown'
import { useEffect, useState } from 'react'

interface ChatMessageProps {
  content: string
  isUser: boolean
  timestamp?: string
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const { actualTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const language = className?.replace('language-', '') || 'text'
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Render a simple code block on server and during hydration
  if (!isClient) {
    return (
      <div className="relative group">
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm font-mono">
          <code>{children.trim()}</code>
        </pre>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => navigator.clipboard.writeText(children)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    )
  }
  
  return (
    <div className="relative group">
      <div className="rounded-lg overflow-hidden">
        <Highlight 
          theme={actualTheme === 'dark' ? themes.vsDark : themes.vsLight} 
          code={children.trim()} 
          language={language as any}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={`${className} p-4 overflow-x-auto text-sm`} 
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
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => navigator.clipboard.writeText(children)}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function ChatMessage({ content, isUser, timestamp }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group w-full py-4"
    >
      {/* Centered container with maximum width */}
      <div className="container max-w-4xl mx-auto px-4">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
            {/* Message */}
            <div
              className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                isUser
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-br-md'
                  : 'bg-transparent text-foreground'
              }`}
            >
              <div className="space-y-3">
                {isUser ? (
                  <span className="whitespace-pre-wrap">{content}</span>
                ) : (
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
                            className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
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
                      li: ({ children }) => <li className="text-sm">{children}</li>,
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
                )}
              </div>
            </div>

            {/* Timestamp */}
            {timestamp && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`text-xs text-muted-foreground mt-1 px-2 ${
                  isUser ? 'text-right' : 'text-left'
                }`}
              >
                {timestamp}
              </motion.div>
            )}

            {/* Actions for AI messages */}
            {!isUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigator.clipboard.writeText(content)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
} 