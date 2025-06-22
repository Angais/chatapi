import { StateCreator } from 'zustand'
import { get, set, del } from 'idb-keyval'

export interface PersistOptions<T> {
  name: string
  partialize?: (state: T) => Partial<T>
  onRehydrateStorage?: (state: T) => void | Promise<void>
}

export const createIndexedDBPersist = <T>(
  config: StateCreator<T>,
  options: PersistOptions<T>
): StateCreator<T> => {
  return (setState, getState, api) => {
    const storeImpl = config(setState, getState, api)

    // Only run on client side
    if (typeof window !== 'undefined') {
      // Load initial state from IndexedDB
      get(options.name)
        .then((persistedState) => {
          if (persistedState) {
            console.log(`📦 [INDEXEDDB] Loaded state from ${options.name}`)
            setState(persistedState)
            if (options.onRehydrateStorage) {
              options.onRehydrateStorage(getState())
            }
          }
        })
        .catch((error) => {
          console.error(`📦 [INDEXEDDB] Failed to load state from ${options.name}:`, error)
        })
    }

    // Save state to IndexedDB on every change (only on client)
    const originalSetState = setState
    const persistingSetState = (partial: any, replace?: boolean | undefined) => {
      if (replace === true) {
        originalSetState(partial, true)
      } else {
        originalSetState(partial, false)
      }
      
      // Only save on client side
      if (typeof window !== 'undefined') {
        // Debounce saves to avoid too many writes
        clearTimeout((window as any).__indexedDBSaveTimeout)
        ;(window as any).__indexedDBSaveTimeout = setTimeout(() => {
          const currentState = getState()
          const stateToSave = options.partialize ? options.partialize(currentState) : currentState
          
          set(options.name, stateToSave)
            .then(() => {
              // console.log(`📦 [INDEXEDDB] Saved state to ${options.name}`) // Commented to reduce noise
            })
            .catch((error) => {
              console.error(`📦 [INDEXEDDB] Failed to save state to ${options.name}:`, error)
              // Fallback to localStorage if IndexedDB fails
              try {
                localStorage.setItem(options.name, JSON.stringify(stateToSave))
                console.log(`📦 [INDEXEDDB] Fallback: Saved to localStorage`)
              } catch (localStorageError) {
                console.error(`📦 [INDEXEDDB] Fallback to localStorage also failed:`, localStorageError)
              }
            })
        }, 100) // 100ms debounce
      }
    }

    // Replace setState with the persisting version
    ;(api as any).setState = persistingSetState

    return storeImpl
  }
} 