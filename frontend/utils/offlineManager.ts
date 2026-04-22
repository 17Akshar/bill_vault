/**
 * Offline-First Cache & Sync Layer for Fintracker
 * 
 * Provides:
 * - Automatic caching of API responses in AsyncStorage
 * - Offline queue for pending writes (POST/PUT/DELETE)
 * - Network status detection
 * - Auto-sync when connectivity is restored
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

const CACHE_PREFIX = '@fintracker_cache_';
const SYNC_QUEUE_KEY = '@fintracker_sync_queue';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
  endpoint: string;
}

interface SyncQueueItem {
  id: string;
  method: 'post' | 'put' | 'delete';
  endpoint: string;
  data?: any;
  timestamp: number;
  retries: number;
}

class OfflineManager {
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  private syncInProgress: boolean = false;

  constructor() {
    this.initNetworkListener();
  }

  // Network status monitoring
  private initNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;

      this.listeners.forEach((cb) => cb(this.isOnline));

      // Auto-sync when coming back online
      if (wasOffline && this.isOnline) {
        console.log('[OfflineManager] Back online - syncing pending changes...');
        this.processSyncQueue();
      }
    });
  }

  // Subscribe to network status changes
  onNetworkChange(callback: (online: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getIsOnline() {
    return this.isOnline;
  }

  // ============= CACHING =============

  private getCacheKey(endpoint: string): string {
    return `${CACHE_PREFIX}${endpoint}`;
  }

  async cacheResponse(endpoint: string, data: any): Promise<void> {
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        endpoint,
      };
      await AsyncStorage.setItem(this.getCacheKey(endpoint), JSON.stringify(entry));
    } catch (e) {
      console.warn('[OfflineManager] Cache write failed:', e);
    }
  }

  async getCachedResponse(endpoint: string): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(this.getCacheKey(endpoint));
      if (!raw) return null;

      const entry: CacheEntry = JSON.parse(raw);
      const age = Date.now() - entry.timestamp;

      // Return cached data (even if stale when offline)
      if (age < CACHE_TTL_MS || !this.isOnline) {
        return entry.data;
      }

      // Expired and online - remove stale cache
      await AsyncStorage.removeItem(this.getCacheKey(endpoint));
      return null;
    } catch (e) {
      console.warn('[OfflineManager] Cache read failed:', e);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (e) {
      console.warn('[OfflineManager] Cache clear failed:', e);
    }
  }

  // ============= CACHED API CALLS =============

  async cachedGet(endpoint: string, forceRefresh: boolean = false): Promise<any> {
    // Try network first if online
    if (this.isOnline && !forceRefresh) {
      try {
        const response = await api.get(endpoint);
        await this.cacheResponse(endpoint, response.data);
        return response.data;
      } catch (e) {
        // Network failed - fall through to cache
        console.warn('[OfflineManager] Network request failed, using cache');
      }
    }

    // Return cached data
    const cached = await this.getCachedResponse(endpoint);
    if (cached !== null) {
      return cached;
    }

    // No cache and offline
    if (!this.isOnline) {
      throw new Error('No internet connection and no cached data available');
    }

    // Online but no cache - make the request
    const response = await api.get(endpoint);
    await this.cacheResponse(endpoint, response.data);
    return response.data;
  }

  // ============= SYNC QUEUE =============

  private async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  async addToSyncQueue(method: 'post' | 'put' | 'delete', endpoint: string, data?: any): Promise<void> {
    const queue = await this.getSyncQueue();
    queue.push({
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      method,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
    await this.saveSyncQueue(queue);
    console.log(`[OfflineManager] Queued ${method.toUpperCase()} ${endpoint}`);
  }

  async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const queue = await this.getSyncQueue();
    let synced = 0;
    let failed = 0;
    const remaining: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        switch (item.method) {
          case 'post':
            await api.post(item.endpoint, item.data);
            break;
          case 'put':
            await api.put(item.endpoint, item.data);
            break;
          case 'delete':
            await api.delete(item.endpoint);
            break;
        }
        synced++;
        console.log(`[OfflineManager] Synced: ${item.method.toUpperCase()} ${item.endpoint}`);
      } catch (e) {
        item.retries++;
        if (item.retries < 3) {
          remaining.push(item);
        } else {
          failed++;
          console.warn(`[OfflineManager] Dropped after 3 retries: ${item.endpoint}`);
        }
      }
    }

    await this.saveSyncQueue(remaining);
    this.syncInProgress = false;

    console.log(`[OfflineManager] Sync complete: ${synced} synced, ${failed} failed, ${remaining.length} pending`);
    return { synced, failed };
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getSyncQueue();
    return queue.length;
  }

  // ============= SMART API WRAPPER =============

  async smartPost(endpoint: string, data: any): Promise<any> {
    if (this.isOnline) {
      try {
        const response = await api.post(endpoint, data);
        return response.data;
      } catch (e) {
        // If network fails, queue it
        await this.addToSyncQueue('post', endpoint, data);
        return { _queued: true, message: 'Saved offline, will sync later' };
      }
    } else {
      await this.addToSyncQueue('post', endpoint, data);
      return { _queued: true, message: 'Saved offline, will sync later' };
    }
  }

  async smartPut(endpoint: string, data: any): Promise<any> {
    if (this.isOnline) {
      try {
        const response = await api.put(endpoint, data);
        return response.data;
      } catch (e) {
        await this.addToSyncQueue('put', endpoint, data);
        return { _queued: true, message: 'Saved offline, will sync later' };
      }
    } else {
      await this.addToSyncQueue('put', endpoint, data);
      return { _queued: true, message: 'Saved offline, will sync later' };
    }
  }

  async smartDelete(endpoint: string): Promise<any> {
    if (this.isOnline) {
      try {
        const response = await api.delete(endpoint);
        return response.data;
      } catch (e) {
        await this.addToSyncQueue('delete', endpoint);
        return { _queued: true, message: 'Saved offline, will sync later' };
      }
    } else {
      await this.addToSyncQueue('delete', endpoint);
      return { _queued: true, message: 'Saved offline, will sync later' };
    }
  }
}

// Singleton instance
const offlineManager = new OfflineManager();
export default offlineManager;
