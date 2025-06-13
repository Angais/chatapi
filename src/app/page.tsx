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
  },
  {
    id: '8',
    content: `Here's a comprehensive example of an async factorial calculator with error handling:

\`\`\`javascript
// Async factorial calculator with validation and delays
class AsyncFactorialCalculator {
  constructor() {
    this.cache = new Map();
    this.isCalculating = false;
  }

  // Simulate API delay
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate input
  validateInput(n) {
    if (typeof n !== 'number' || !Number.isInteger(n)) {
      throw new Error('Input must be a non-negative integer');
    }
    if (n < 0) {
      throw new Error('Factorial is not defined for negative numbers');
    }
    if (n > 170) {
      throw new Error('Number too large - JavaScript cannot handle factorials > 170!');
    }
  }

  // Async factorial with progress tracking
  async calculateFactorial(n, onProgress = null) {
    this.validateInput(n);
    
    // Check cache first
    if (this.cache.has(n)) {
      console.log(\`Cache hit for factorial(\${n})\`);
      return this.cache.get(n);
    }

    this.isCalculating = true;
    let result = 1;
    
    try {
      console.log(\`Starting calculation of factorial(\${n})\`);
      
      for (let i = 1; i <= n; i++) {
        result *= i;
        
        // Report progress every 10 iterations
        if (i % 10 === 0 && onProgress) {
          const progress = (i / n) * 100;
          onProgress({ current: i, total: n, progress: progress.toFixed(1) });
          
          // Small delay to simulate intensive computation
          await this.delay(1);
        }
      }
      
      // Cache the result
      this.cache.set(n, result);
      console.log(\`Factorial(\${n}) = \${result}\`);
      
      return result;
    } catch (error) {
      console.error('Error calculating factorial:', error);
      throw error;
    } finally {
      this.isCalculating = false;
    }
  }

  // Batch calculate multiple factorials
  async calculateBatch(numbers) {
    const results = [];
    
    for (const num of numbers) {
      try {
        const result = await this.calculateFactorial(num, (progress) => {
          console.log(\`Progress for \${num}: \${progress.progress}%\`);
        });
        results.push({ number: num, result, success: true });
      } catch (error) {
        results.push({ number: num, error: error.message, success: false });
      }
    }
    
    return results;
  }

  // Get calculation status
  getStatus() {
    return {
      isCalculating: this.isCalculating,
      cacheSize: this.cache.size,
      cachedValues: Array.from(this.cache.keys()).sort((a, b) => a - b)
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('Cache cleared');
  }
}

// Usage examples
async function demonstrateAsyncFactorial() {
  const calculator = new AsyncFactorialCalculator();
  
  try {
    // Single calculation with progress
    console.log('=== Single Calculation ===');
    const result = await calculator.calculateFactorial(20, (progress) => {
      console.log(\`Progress: \${progress.current}/\${progress.total} (\${progress.progress}%)\`);
    });
    console.log(\`Result: \${result}\`);
    
    // Batch calculation
    console.log('\\n=== Batch Calculation ===');
    const batchResults = await calculator.calculateBatch([5, 10, 15, 25]);
    console.table(batchResults);
    
    // Status check
    console.log('\\n=== Calculator Status ===');
    console.log(calculator.getStatus());
    
  } catch (error) {
    console.error('Demonstration failed:', error);
  }
}

// Advanced usage with Promise.all for parallel calculations
async function parallelFactorialCalculation() {
  const calculator = new AsyncFactorialCalculator();
  const numbers = [5, 8, 12, 15, 18];
  
  console.log('Starting parallel calculations...');
  
  const promises = numbers.map(async (num) => {
    const startTime = Date.now();
    try {
      const result = await calculator.calculateFactorial(num);
      const duration = Date.now() - startTime;
      return { num, result, duration, success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      return { num, error: error.message, duration, success: false };
    }
  });
  
  const results = await Promise.all(promises);
  
  console.log('Parallel calculation results:');
  results.forEach(({ num, result, error, duration, success }) =>results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success }) results.forEach(({ num, result, error, duration, success })  {
    if (success) {
      console.log(\`factorial(\${num}) = \${result} (took \${duration}ms)\`);
    } else {
      console.error(\`factorial(\${num}) failed: \${error} (took \${duration}ms)\`);
    }
  });
  
  return results;
}

// Error handling examples
async function errorHandlingExamples() {
  const calculator = new AsyncFactorialCalculator();
  
  const testCases = [
    { input: -5, description: 'Negative number' },
    { input: 3.14, description: 'Decimal number' },
    { input: '10', description: 'String input' },
    { input: 200, description: 'Too large number' },
    { input: 10, description: 'Valid input' }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(\`Testing: \${testCase.description} (input: \${testCase.input})\`);
      const result = await calculator.calculateFactorial(testCase.input);
      console.log(\`✅ Success: \${result}\`);
    } catch (error) {
      console.log(\`❌ Error: \${error.message}\`);
    }
    console.log('---');
  }
}

// Run demonstrations
demonstrateAsyncFactorial();
parallelFactorialCalculation();
errorHandlingExamples();
\`\`\`

This example shows advanced async patterns with factorial calculations including caching, progress tracking, error handling, and parallel execution!`,
    isUser: false,
    timestamp: '10:36 AM'
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
