'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Info } from 'lucide-react'
import { Message } from '@/stores/chat-store'

interface DevInfoModalProps {
  message: Message
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DevInfoModal({ message, open, onOpenChange }: DevInfoModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleCopy = (content: string, section: string) => {
    navigator.clipboard.writeText(content)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const CodeBlock = ({ title, content, section }: { title: string; content: string; section: string }) => (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs cursor-pointer"
          onClick={() => handleCopy(content, section)}
        >
          <Copy className="w-3 h-3 mr-1" />
          {copiedSection === section ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <div className="w-full max-w-[550px]">
        <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto overflow-y-auto max-h-60 w-full custom-scrollbar">
          <code className="whitespace-pre">{content}</code>
        </pre>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-full max-h-[80vh] overflow-y-auto overflow-x-hidden" data-dev-info>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Development Information
          </DialogTitle>
          <DialogDescription>
            Technical details of the {message.isUser ? 'request sent to' : 'response received from'} OpenAI API
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic message information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Message Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Type:</span> {message.isUser ? 'User' : 'Assistant'}
              </div>
              <div>
                <span className="font-medium">Timestamp:</span> {message.timestamp}
              </div>
              <div>
                <span className="font-medium">ID:</span> {message.id}
              </div>
            </div>
          </div>

          {/* API request information (for user messages) */}
          {message.debugInfo?.sentToAPI && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Request Sent to OpenAI</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Model:</span> {message.debugInfo.sentToAPI.model}
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span> {new Date(message.debugInfo.sentToAPI.timestamp).toLocaleString()}
                </div>
                {message.debugInfo.sentToAPI.temperature && (
                  <div>
                    <span className="font-medium">Temperature:</span> {message.debugInfo.sentToAPI.temperature}
                  </div>
                )}
                {message.debugInfo.sentToAPI.max_tokens && (
                  <div>
                    <span className="font-medium">Max Tokens:</span> {message.debugInfo.sentToAPI.max_tokens}
                  </div>
                )}
                {message.debugInfo.sentToAPI.max_completion_tokens && (
                  <div>
                    <span className="font-medium">Max Completion Tokens:</span> {message.debugInfo.sentToAPI.max_completion_tokens}
                  </div>
                )}
                {message.debugInfo.sentToAPI.reasoning_effort && (
                  <div>
                    <span className="font-medium">Reasoning Effort:</span> {message.debugInfo.sentToAPI.reasoning_effort}
                  </div>
                )}
              </div>

              <CodeBlock
                title="Messages Sent"
                content={formatJSON(message.debugInfo.sentToAPI.messages)}
                section="sent-messages"
              />

              <CodeBlock
                title="Complete Parameters"
                content={formatJSON(message.debugInfo.sentToAPI)}
                section="sent-full"
              />
            </div>
          )}

          {/* API response information (for assistant messages) */}
          {message.debugInfo?.receivedFromAPI && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Response Received from OpenAI</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Model:</span> {message.debugInfo.receivedFromAPI.model}
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span> {new Date(message.debugInfo.receivedFromAPI.timestamp).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Response Time:</span> {message.debugInfo.receivedFromAPI.responseTime}ms
                </div>
                {message.debugInfo.receivedFromAPI.reasoningNotSupported && (
                  <div className="col-span-2">
                    <span className="font-medium text-amber-600">Note:</span> 
                    <span className="text-amber-600"> Model auto-configured to no-reasoning (reasoning effort not supported)</span>
                  </div>
                )}
                {message.debugInfo.receivedFromAPI.usage && (
                  <>
                    {message.debugInfo.receivedFromAPI.usage.prompt_tokens && (
                      <div>
                        <span className="font-medium">Prompt Tokens:</span> {message.debugInfo.receivedFromAPI.usage.prompt_tokens}
                      </div>
                    )}
                    {message.debugInfo.receivedFromAPI.usage.completion_tokens && (
                      <div>
                        <span className="font-medium">Completion Tokens:</span> {message.debugInfo.receivedFromAPI.usage.completion_tokens}
                      </div>
                    )}
                    {message.debugInfo.receivedFromAPI.usage.total_tokens && (
                      <div>
                        <span className="font-medium">Total Tokens:</span> {message.debugInfo.receivedFromAPI.usage.total_tokens}
                      </div>
                    )}
                  </>
                )}
              </div>

              <CodeBlock
                title="Complete Response"
                content={formatJSON(message.debugInfo.receivedFromAPI)}
                section="received-full"
              />
            </div>
          )}

          {/* Message content */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Message Content</h3>
            <CodeBlock
              title="Message Content"
              content={typeof message.content === 'string' ? message.content : formatJSON(message.content)}
              section="message-content"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 