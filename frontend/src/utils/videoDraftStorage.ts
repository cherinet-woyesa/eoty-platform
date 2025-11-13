/**
 * Video Draft Storage Utility
 * 
 * Handles auto-saving video recordings to localStorage/IndexedDB
 * to prevent data loss during recording sessions
 */

interface VideoDraft {
  id: string;
  blob: Blob;
  metadata: {
    title?: string;
    description?: string;
    courseId?: string;
    lessonId?: string;
    duration: number;
    quality: string;
    timestamp: number;
    fileSize: number;
  };
}

const STORAGE_KEY_PREFIX = 'video_draft_';
const MAX_DRAFTS = 10; // Maximum number of drafts to keep
const AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds

class VideoDraftStorage {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private currentDraftId: string | null = null;

  /**
   * Check if IndexedDB is available
   */
  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Get storage quota information
   */
  async getStorageInfo(): Promise<{ used: number; quota: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      };
    }
    return { used: 0, quota: 0, available: 0 };
  }

  /**
   * Save draft to IndexedDB (preferred) or localStorage (fallback)
   */
  async saveDraft(blob: Blob, metadata: VideoDraft['metadata']): Promise<string> {
    const draftId = metadata.lessonId || `draft_${Date.now()}`;
    const draft: VideoDraft = {
      id: draftId,
      blob,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        fileSize: blob.size
      }
    };

    if (this.isIndexedDBAvailable()) {
      return this.saveToIndexedDB(draft);
    } else {
      return this.saveToLocalStorage(draft);
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(draft: VideoDraft): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoDraftsDB', 1);

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to localStorage');
        resolve(this.saveToLocalStorage(draft));
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Ensure object store exists
        if (!db.objectStoreNames.contains('drafts')) {
          console.warn('Drafts object store does not exist, falling back to localStorage');
          resolve(this.saveToLocalStorage(draft));
          return;
        }

        try {
          const transaction = db.transaction(['drafts'], 'readwrite');
          const store = transaction.objectStore('drafts');

          // Convert blob to ArrayBuffer for storage
          draft.blob.arrayBuffer().then(buffer => {
            const draftData = {
              ...draft,
              blobData: buffer
            };

            const putRequest = store.put(draftData);
            putRequest.onsuccess = () => {
              console.log('✅ Draft saved to IndexedDB:', draft.id);
              this.cleanupOldDrafts(db);
              resolve(draft.id);
            };
            putRequest.onerror = () => {
              console.warn('Failed to save to IndexedDB, falling back to localStorage');
              resolve(this.saveToLocalStorage(draft));
            };
          }).catch(() => {
            console.warn('Failed to convert blob, falling back to localStorage');
            resolve(this.saveToLocalStorage(draft));
          });
        } catch (error) {
          console.warn('Error saving to IndexedDB:', error);
          resolve(this.saveToLocalStorage(draft));
        }
      };

      request.onupgradeneeded = (event: any) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('drafts')) {
          const objectStore = db.createObjectStore('drafts', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'metadata.timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Save to localStorage (fallback for smaller files)
   */
  private saveToLocalStorage(draft: VideoDraft): string {
    try {
      // Check if blob is too large for localStorage (usually 5-10MB limit)
      if (draft.blob.size > 5 * 1024 * 1024) {
        console.warn('⚠️ Video too large for localStorage, using IndexedDB fallback');
        // Try to use IndexedDB even if check failed
        return this.saveToIndexedDB(draft).catch(() => {
          throw new Error('Video too large to save locally');
        });
      }

      // Convert blob to base64 for localStorage
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const draftData = {
          ...draft,
          blobData: base64Data
        };
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${draft.id}`, JSON.stringify(draftData));
        console.log('✅ Draft saved to localStorage:', draft.id);
      };
      reader.readAsDataURL(draft.blob);
      
      return draft.id;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }

  /**
   * Load draft from storage
   */
  async loadDraft(draftId: string): Promise<VideoDraft | null> {
    if (this.isIndexedDBAvailable()) {
      return this.loadFromIndexedDB(draftId);
    } else {
      return this.loadFromLocalStorage(draftId);
    }
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(draftId: string): Promise<VideoDraft | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('VideoDraftsDB', 1);

      request.onerror = () => {
        console.warn('IndexedDB not available, trying localStorage');
        resolve(this.loadFromLocalStorage(draftId));
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Check if object store exists
        if (!db.objectStoreNames.contains('drafts')) {
          console.warn('Drafts object store does not exist, trying localStorage');
          resolve(this.loadFromLocalStorage(draftId));
          return;
        }

        try {
          const transaction = db.transaction(['drafts'], 'readonly');
          const store = transaction.objectStore('drafts');
          const getRequest = store.get(draftId);

          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (!result) {
              // Try localStorage as fallback
              resolve(this.loadFromLocalStorage(draftId));
              return;
            }

            // Convert ArrayBuffer back to Blob
            const blob = new Blob([result.blobData], { type: 'video/webm' });
            const draft: VideoDraft = {
              id: result.id,
              blob,
              metadata: result.metadata
            };

            resolve(draft);
          };

          getRequest.onerror = () => {
            console.warn('Failed to load from IndexedDB, trying localStorage');
            resolve(this.loadFromLocalStorage(draftId));
          };
        } catch (error) {
          console.warn('Error loading from IndexedDB:', error);
          resolve(this.loadFromLocalStorage(draftId));
        }
      };

      request.onupgradeneeded = (event: any) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('drafts')) {
          const objectStore = db.createObjectStore('drafts', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'metadata.timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Load from localStorage
   */
  private loadFromLocalStorage(draftId: string): VideoDraft | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${draftId}`);
      if (!data) return null;

      const draftData = JSON.parse(data);
      // Convert base64 back to Blob
      const byteCharacters = atob(draftData.blobData.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/webm' });

      return {
        id: draftData.id,
        blob,
        metadata: draftData.metadata
      };
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Get all saved drafts
   */
  async getAllDrafts(): Promise<VideoDraft[]> {
    if (this.isIndexedDBAvailable()) {
      return this.getAllFromIndexedDB();
    } else {
      return this.getAllFromLocalStorage();
    }
  }

  /**
   * Get all from IndexedDB
   */
  private async getAllFromIndexedDB(): Promise<VideoDraft[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoDraftsDB', 1);

      request.onerror = () => {
        console.warn('IndexedDB not available, returning empty array');
        resolve([]);
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Check if object store exists
        if (!db.objectStoreNames.contains('drafts')) {
          console.warn('Drafts object store does not exist, returning empty array');
          resolve([]);
          return;
        }

        try {
          const transaction = db.transaction(['drafts'], 'readonly');
          const store = transaction.objectStore('drafts');
          
          // Check if index exists
          if (!store.indexNames.contains('timestamp')) {
            // If index doesn't exist, use getAll instead
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const results = getAllRequest.result;
              const drafts: VideoDraft[] = results.map((result: any) => ({
                id: result.id,
                blob: new Blob([result.blobData], { type: 'video/webm' }),
                metadata: result.metadata
              }));
              drafts.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
              resolve(drafts);
            };
            getAllRequest.onerror = () => {
              console.warn('Failed to load drafts from IndexedDB');
              resolve([]);
            };
          } else {
            const index = store.index('timestamp');
            const getAllRequest = index.getAll();

            getAllRequest.onsuccess = () => {
              const results = getAllRequest.result;
              const drafts: VideoDraft[] = results.map((result: any) => ({
                id: result.id,
                blob: new Blob([result.blobData], { type: 'video/webm' }),
                metadata: result.metadata
              }));

              // Sort by timestamp (newest first)
              drafts.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
              resolve(drafts);
            };

            getAllRequest.onerror = () => {
              console.warn('Failed to load drafts from IndexedDB');
              resolve([]);
            };
          }
        } catch (error) {
          console.warn('Error accessing IndexedDB:', error);
          resolve([]);
        }
      };

      request.onupgradeneeded = (event: any) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('drafts')) {
          const objectStore = db.createObjectStore('drafts', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'metadata.timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get all from localStorage
   */
  private getAllFromLocalStorage(): VideoDraft[] {
    const drafts: VideoDraft[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const draft = this.loadFromLocalStorage(key.replace(STORAGE_KEY_PREFIX, ''));
        if (draft) {
          drafts.push(draft);
        }
      }
    }

    // Sort by timestamp (newest first)
    drafts.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
    return drafts;
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    if (this.isIndexedDBAvailable()) {
      return this.deleteFromIndexedDB(draftId);
    } else {
      return this.deleteFromLocalStorage(draftId);
    }
  }

  private async deleteFromIndexedDB(draftId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoDraftsDB', 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['drafts'], 'readwrite');
        const store = transaction.objectStore('drafts');
        const deleteRequest = store.delete(draftId);

        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(new Error('Failed to delete draft'));
      };
    });
  }

  private deleteFromLocalStorage(draftId: string): void {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${draftId}`);
  }

  /**
   * Cleanup old drafts (keep only MAX_DRAFTS most recent)
   */
  private async cleanupOldDrafts(db?: IDBDatabase): Promise<void> {
    const drafts = await this.getAllDrafts();
    
    if (drafts.length > MAX_DRAFTS) {
      const draftsToDelete = drafts.slice(MAX_DRAFTS);
      for (const draft of draftsToDelete) {
        await this.deleteDraft(draft.id);
      }
      console.log(`🧹 Cleaned up ${draftsToDelete.length} old drafts`);
    }
  }

  /**
   * Start auto-saving for a recording session
   */
  startAutoSave(
    getBlob: () => Blob | null,
    getMetadata: () => VideoDraft['metadata'],
    onSaveComplete?: (draftId: string) => void
  ): string {
    const draftId = `autosave_${Date.now()}`;
    this.currentDraftId = draftId;

    this.autoSaveInterval = setInterval(async () => {
      const blob = getBlob();
      if (!blob || blob.size === 0) return;

      try {
        const metadata = getMetadata();
        const savedId = await this.saveDraft(blob, metadata);
        console.log('💾 Auto-saved draft:', savedId);
        onSaveComplete?.(savedId);
      } catch (error) {
        console.warn('⚠️ Auto-save failed:', error);
      }
    }, AUTO_SAVE_INTERVAL);

    return draftId;
  }

  /**
   * Stop auto-saving
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.currentDraftId = null;
  }

  /**
   * Clear all drafts
   */
  async clearAllDrafts(): Promise<void> {
    const drafts = await this.getAllDrafts();
    for (const draft of drafts) {
      await this.deleteDraft(draft.id);
    }
    console.log('🗑️ All drafts cleared');
  }
}

export const videoDraftStorage = new VideoDraftStorage();
export type { VideoDraft };


