"use client";

import { motion } from "framer-motion";
import { MessageCircle, Sparkles, Code, Lightbulb } from "lucide-react";
import Image from "next/image";
import { ChatInputRef } from "@/components/chat-input";

interface EmptyStateProps {
  chatInputRef?: React.RefObject<ChatInputRef | null>;
}

export function EmptyState({ chatInputRef }: EmptyStateProps) {
  const suggestionPrompts = {
    creative: [
      "Write me a poem about ",
      "Tell me a short story about ",
      "Create a creative description of ",
      "Write a song about ",
      "Invent a fictional character who ",
    ],
    code: [
      "Help me debug this code: ",
      "Explain how to implement ",
      "Write a function that ",
      "Review this code and suggest improvements: ",
      "Help me understand why this error occurs: ",
    ],
    problem: [
      "Help me brainstorm solutions for ",
      "Analyze the pros and cons of ",
      "Create a step-by-step plan to ",
      "What are the best strategies for ",
      "Help me think through this problem: ",
    ],
    question: [
      "Can you explain ",
      "What do you think about ",
      "How does ",
      "Tell me more about ",
      "What's the difference between ",
    ],
  };

  const suggestions = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Write something creative",
      description: "A poem, a story, or anything imaginative",
      type: "creative" as const,
    },
    {
      icon: <Code className="w-5 h-5" />,
      title: "Help with code",
      description: "Debugging, explanations, or writing functions",
      type: "code" as const,
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Solve problems",
      description: "Analysis, planning, or brainstorming",
      type: "problem" as const,
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Ask questions",
      description: "About any topic that interests you",
      type: "question" as const,
    },
  ];

  const handleSuggestionClick = (type: keyof typeof suggestionPrompts) => {
    if (!chatInputRef?.current) return;

    const prompts = suggestionPrompts[type];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    chatInputRef.current.setText(randomPrompt);
  };

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
        <div className="w-16 h-16 rounded-2xl logo-bg flex items-center justify-center mx-auto mb-6 p-2">
          <Image
            src="/sunflower-icon.png"
            alt="ChatAPI Logo"
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
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
            className="p-4 rounded-xl border border-border bg-card hover:bg-accent/50 cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.01] active:scale-[0.99] group select-none"
            onClick={() => handleSuggestionClick(suggestion.type)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg logo-bg logo-bg-hover flex items-center justify-center logo-icon transition-colors">
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
  );
}
