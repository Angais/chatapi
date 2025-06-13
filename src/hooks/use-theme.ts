'use client'

import { create } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'
import { useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
)

export function useTheme() {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return {
    theme,
    setTheme,
    actualTheme: theme === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
  }
} 