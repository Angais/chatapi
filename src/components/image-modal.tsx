'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatInputRef } from '@/components/chat-input'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  imageAlt: string
  originalUrl?: string // For cache URLs
  chatInputRef?: React.RefObject<ChatInputRef | null>
}

export function ImageModal({ isOpen, onClose, imageSrc, imageAlt, originalUrl, chatInputRef }: ImageModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!imageSrc.startsWith('data:')) return
    
    setIsDownloading(true)
    try {
      // Create a link element and trigger download
      const link = document.createElement('a')
      link.href = imageSrc
      link.download = `generated-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download image:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleEdit = () => {
    if (!imageSrc.startsWith('data:') || !chatInputRef?.current) return
    
    // Use original cache URL if available, otherwise use the data URL
    const urlToUse = originalUrl && originalUrl.startsWith('cache:') ? originalUrl : imageSrc
    
    // Add image to chat input for editing
    chatInputRef.current.addImage(urlToUse, `edited-image-${Date.now()}.png`)
    // Close the modal after adding the image
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image container with buttons */}
            <div className="relative flex items-center justify-center" style={{ minWidth: '300px', minHeight: '200px' }}>
              {/* Action buttons - positioned based on minimum area for small images */}
              <div 
                className="absolute z-10 flex gap-2"
                style={{
                  top: '12px',
                  right: '12px',
                  // Ensure buttons are always positioned correctly even for very small images
                  minWidth: 'fit-content'
                }}
              >
                {/* Edit button */}
                {chatInputRef && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-black/70 hover:bg-black/90 text-white border-none shadow-lg"
                    onClick={handleEdit}
                    title="Edit image"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Download button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white border-none shadow-lg"
                  onClick={handleDownload}
                  disabled={isDownloading || !imageSrc.startsWith('data:')}
                  title="Download image"
                >
                  <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
                </Button>
                
                {/* Close button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/70 hover:bg-black/90 text-white border-none shadow-lg"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Image */}
              <img
                src={imageSrc}
                alt={imageAlt}
                className="rounded-lg shadow-2xl object-contain"
                style={{ 
                  maxWidth: 'calc(100vw - 2rem)', 
                  maxHeight: 'calc(80vh - 2rem)',
                  minWidth: '300px',
                  minHeight: '200px',
                  width: 'auto',
                  height: 'auto'
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 