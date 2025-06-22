'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  imageAlt: string
}

export function ImageModal({ isOpen, onClose, imageSrc, imageAlt }: ImageModalProps) {
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
            <div className="relative">
              {/* Close button */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Download button */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-14 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
                onClick={handleDownload}
                disabled={isDownloading || !imageSrc.startsWith('data:')}
              >
                <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
              </Button>

              {/* Image */}
              <img
                src={imageSrc}
                alt={imageAlt}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(80vh - 2rem)' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 