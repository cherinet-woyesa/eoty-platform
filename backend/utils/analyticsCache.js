/**
 * Simple in-memory cache for analytics data
 * For production, consider using Redis for distributed caching
 */

class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached data
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data with TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Delete cached data
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let activeEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }
}

// Create singleton instance
const analyticsCache = new AnalyticsCache();

// Run cleanup every 10 minutes
setInterval(() => {
  const cleaned = analyticsCache.cleanup();
  if (cleaned > 0) {
    console.log(`Analytics cache cleanup: removed ${cleaned} expired entries`);
  }
}, 10 * 60 * 1000);

module.exports = analyticsCache;
