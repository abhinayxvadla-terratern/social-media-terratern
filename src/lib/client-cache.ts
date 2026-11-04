/**
 * In-memory client-side cache for snappy tab transitions across admin tabs.
 * Allows pages to render previously loaded data in 0ms while refreshing in the background.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCachedData<T>(key: string, maxAgeMs = 60000): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function setCachedData<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function invalidateCache(key?: string): void {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}
