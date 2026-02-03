/**
 * Client-side in-memory cache for API responses.
 * Provides fast caching within a browser session.
 * 
 * - Memory-only (cleared on page refresh)
 * - TTL-based expiration
 * - Reduces calls to server API during navigation
 * - Uses lazy cleanup (on access) to avoid perpetual intervals
 */

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

// Default TTLs (milliseconds)
export const CLIENT_CACHE_TTL = {
	WEATHER_FORECAST: 5 * 60 * 1000,     // 5 minutes
	WEATHER_HISTORICAL: 30 * 60 * 1000,  // 30 minutes
	FLIGHT_ROUTE: 10 * 60 * 1000,        // 10 minutes
	AIRLINE_SEARCH: 30 * 60 * 1000,      // 30 minutes
	ROUTING: 30 * 60 * 1000,             // 30 minutes
	// Geocoding & Cities (Geoapify)
	CITY_SEARCH: 30 * 60 * 1000,         // 30 minutes (cities rarely change within session)
	GEOCODING: 30 * 60 * 1000,           // 30 minutes (addresses don't move)
	// Places (Foursquare)
	PLACES_FOOD: 15 * 60 * 1000,         // 15 minutes
	PLACES_ATTRACTIONS: 15 * 60 * 1000,  // 15 minutes
	PLACES_LODGING: 15 * 60 * 1000,      // 15 minutes
	PLACE_DETAILS: 30 * 60 * 1000        // 30 minutes (individual place details)
} as const;

export type ClientCacheType = keyof typeof CLIENT_CACHE_TTL;

// Cleanup threshold: run cleanup when cache exceeds this many entries
const CLEANUP_THRESHOLD = 100;
// Minimum time between cleanups (milliseconds)
const CLEANUP_INTERVAL = 60 * 1000;

class ClientCache {
	private cache = new Map<string, CacheEntry<unknown>>();
	private pendingRequests = new Map<string, Promise<unknown>>();
	private lastCleanup = 0;

	/**
	 * Run cleanup if needed (lazy cleanup strategy).
	 * Triggers when cache is large enough and enough time has passed.
	 */
	private maybeCleanup(): void {
		const now = Date.now();
		if (
			this.cache.size > CLEANUP_THRESHOLD &&
			now - this.lastCleanup > CLEANUP_INTERVAL
		) {
			this.cleanup();
			this.lastCleanup = now;
		}
	}

	/**
	 * Get a cached value by key.
	 * Returns null if not found or expired.
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return entry.value;
	}

	/**
	 * Set a cached value with TTL.
	 */
	set<T>(key: string, value: T, type: ClientCacheType): void {
		const ttl = CLIENT_CACHE_TTL[type];
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + ttl
		});
		this.maybeCleanup();
	}

	/**
	 * Set a cached value with custom TTL (milliseconds).
	 */
	setWithTtl<T>(key: string, value: T, ttlMs: number): void {
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + ttlMs
		});
		this.maybeCleanup();
	}

	/**
	 * Check if a key exists and is not expired.
	 */
	has(key: string): boolean {
		return this.get(key) !== null;
	}

	/**
	 * Delete a cached entry.
	 */
	delete(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Clear all cache entries.
	 */
	clear(): void {
		this.cache.clear();
		this.pendingRequests.clear();
	}

	/**
	 * Remove expired entries.
	 */
	cleanup(): number {
		const now = Date.now();
		let removed = 0;

		for (const [key, entry] of this.cache) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
				removed++;
			}
		}

		return removed;
	}

	/**
	 * Get cache statistics.
	 */
	getStats(): { size: number; pending: number } {
		return {
			size: this.cache.size,
			pending: this.pendingRequests.size
		};
	}

	/**
	 * Deduplicate concurrent requests for the same key.
	 * If a request is already in progress, return its promise.
	 * Otherwise, execute the fetcher and cache the result.
	 */
	async dedupeRequest<T>(
		key: string,
		fetcher: () => Promise<T>,
		type: ClientCacheType
	): Promise<T> {
		// Check cache first
		const cached = this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		// Check if request is already pending
		const pending = this.pendingRequests.get(key) as Promise<T> | undefined;
		if (pending) {
			return pending;
		}

		// Start new request
		const request = (async () => {
			try {
				const result = await fetcher();
				this.set(key, result, type);
				return result;
			} finally {
				this.pendingRequests.delete(key);
			}
		})();

		this.pendingRequests.set(key, request);
		return request;
	}
}

// Singleton instance
export const clientCache = new ClientCache();
