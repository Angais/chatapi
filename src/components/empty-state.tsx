'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Sparkles, Code, Lightbulb } from 'lucide-react'

export function EmptyState() {
  const suggestions = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Write something creative",
      description: "A poem, a story, or anything imaginative"
    },
    {
      icon: <Code className="w-5 h-5" />,
      title: "Help with code",
      description: "Debugging, explanations, or writing functions"
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Solve problems",
      description: "Analysis, planning, or brainstorming"
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Ask questions",
      description: "About any topic that interests you"
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto"
    >
      {/* Logo and greeting */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center mb-12 select-none"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
          <span className="text-primary-foreground font-bold text-2xl">C</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Hello! I'm ChatAPI</h1>
        <p className="text-muted-foreground text-lg">
          How can I help you today?
        </p>
      </motion.div>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl"
      >
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
            whileHover={{ 
              scale: 1.02,
              transition: { type: "spring", stiffness: 400, damping: 17 }
            }}
            whileTap={{ scale: 0.98 }}
            className="p-4 rounded-xl border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors group select-none"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                {suggestion.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">
                  {suggestion.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {suggestion.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional indication */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="text-xs text-muted-foreground text-center mt-8 max-w-md select-none"
      >
        Click on any of the suggestions or write your own question below
      </motion.p>
    </motion.div>
  )
} 