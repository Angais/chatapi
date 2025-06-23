import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Add debug utility
export const isDev = process.env.NODE_ENV === 'development'

export function debugLog(...args: any[]) {
  if (isDev) {
    console.log(...args)
  }
} 