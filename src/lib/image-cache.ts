// Image cache utility using IndexedDB for persistent storage
class ImageCacheDB {
  private dbName = 'chatapi-images'
  private dbVersion = 1
  private storeName = 'images'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async setImage(id: string, base64Data: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const imageData = {
        id,
        data: base64Data,
        timestamp: Date.now()
      }
      
      const request = store.put(imageData)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getImage(id: string): Promise<string | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.get(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.data : null)
      }
    })
  }

  async deleteImage(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearOldImages(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init()
    
    const cutoff = Date.now() - maxAge
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('timestamp')
      
      const range = IDBKeyRange.upperBound(cutoff)
      const request = index.openCursor(range)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  }
}

// Global instance
let imageCacheDB: ImageCacheDB | null = null

export const getImageCache = (): ImageCacheDB => {
  if (!imageCacheDB) {
    imageCacheDB = new ImageCacheDB()
  }
  return imageCacheDB
}

// Helper functions for easy use
export const storeImage = async (id: string, base64Data: string): Promise<void> => {
  try {
    const cache = getImageCache()
    await cache.setImage(id, base64Data)
    console.log(`💾 [IMAGE CACHE] Stored image ${id}`)
  } catch (error) {
    console.error('💾 [IMAGE CACHE] Failed to store image:', error)
    // Fallback to memory cache
    if (typeof window !== 'undefined') {
      const globalThis = window as any
      if (!globalThis.imageCache) {
        globalThis.imageCache = new Map()
      }
      globalThis.imageCache.set(id, base64Data)
    }
  }
}

export const retrieveImage = async (id: string): Promise<string | null> => {
  try {
    const cache = getImageCache()
    const data = await cache.getImage(id)
    if (data) {
      console.log(`💾 [IMAGE CACHE] Retrieved image ${id}`)
      return data
    }
  } catch (error) {
    console.error('💾 [IMAGE CACHE] Failed to retrieve image:', error)
  }
  
  // Fallback to memory cache
  if (typeof window !== 'undefined') {
    const globalThis = window as any
    if (globalThis.imageCache && globalThis.imageCache.has(id)) {
      console.log(`🧠 [MEMORY CACHE] Retrieved image ${id}`)
      return globalThis.imageCache.get(id)
    }
  }
  
  return null
}

export const cleanupOldImages = async (): Promise<void> => {
  try {
    const cache = getImageCache()
    await cache.clearOldImages()
    console.log('💾 [IMAGE CACHE] Cleaned up old images')
  } catch (error) {
    console.error('💾 [IMAGE CACHE] Failed to cleanup old images:', error)
  }
} 