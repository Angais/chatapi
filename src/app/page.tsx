'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/header'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { TypingIndicator } from '@/components/typing-indicator'
import { EmptyState } from '@/components/empty-state'

// Sample data to showcase the UI
const sampleMessages = [
  {
    id: '1',
    content: 'Hello! How does ChatAPI work?',
    isUser: true,
    timestamp: '10:28 AM'
  },
  {
    id: '2',
    content: 'Hello! ChatAPI is an artificial intelligence assistant designed to help you with a wide variety of tasks. I can help you with:\n\n• Programming and development\n• Analysis and problem solving\n• Creative writing\n• Explanations of complex concepts\n• And much more\n\nWhat would you like me to help you with today?',
    isUser: false,
    timestamp: '10:28 AM'
  },
  {
    id: '3',
    content: 'Could you help me create a JavaScript function that calculates the factorial of a number?',
    isUser: true,
    timestamp: '10:30 AM'
  },
  {
    id: '4',
    content: `Of course! I'll help you create a function to calculate the factorial. Here are several options:

## Recursive Version
\`\`\`javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`\`\`

## Iterative Version (more efficient)
\`\`\`javascript
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
\`\`\`

## With error validation
\`\`\`javascript
function factorial(n) {
  if (n < 0) throw new Error('Factorial of negative numbers does not exist');
  if (n === 0 || n === 1) return 1;
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
\`\`\`

## Usage example:
\`\`\`javascript
console.log(factorial(5)); // 120
console.log(factorial(0)); // 1
console.log(factorial(7)); // 5040
\`\`\`

The iterative version is more efficient for large numbers since it avoids the risk of stack overflow. Would you like me to explain any specific concept?`,
    isUser: false,
    timestamp: '10:31 AM'
  },
  {
    id: '5',
    content: 'Perfect, thank you very much. What would be the performance difference between the recursive and iterative versions?',
    isUser: true,
    timestamp: '10:32 AM'
  },
  {
    id: '6',
    content: `Excellent question. There are several important performance differences:

## **Time Complexity**
Both have **O(n)** - linear time, but recursive has additional overhead.

## **Space Complexity**
- **Iterative:** O(1) - constant space
- **Recursive:** O(n) - uses call stack

## **Practical Performance**

### Recursive:
- Each call uses memory on the stack  
- Can cause \`stack overflow\` with large numbers
- Slower due to function call overhead

### Iterative:  
- Uses constant memory
- No risk of stack overflow
- Faster and more efficient

## **Performance test:**
\`\`\`javascript
console.time('Recursive');
factorial_recursive(1000);
console.timeEnd('Recursive');

console.time('Iterative'); 
factorial_iterative(1000);
console.timeEnd('Iterative');
\`\`\`

**Recommendation:** Use the iterative version for production applications, especially with large numbers.`,
    isUser: false,
    timestamp: '10:33 AM'
  },
  {
    id: '7',
    content: 'Great, now I understand the difference. Could you show me an example of usage with `async/await`?',
    isUser: true,
    timestamp: '10:35 AM'
  }
]

export default function ChatPage() {
  const [messages] = useState(sampleMessages)
  const [isTyping] = useState(true) // Change to false to hide the indicator
  // To show the home screen instead of messages, change to true:
  const [showEmpty] = useState(false) 

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 flex flex-col">
        {showEmpty ? (
          /* 🏠 HOME SCREEN - To activate, change showEmpty to true */
          <EmptyState />
        ) : (
          /* 💬 CHAT VIEW - Conversation messages */
          <motion.div 
            className="flex-1 overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  content={message.content}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                />
              ))}
              
              {isTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        <ChatInput />
      </main>
    </div>
  )
}
