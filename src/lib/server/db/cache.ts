/**
 * Server-side SQLite cache for API responses.
 * Provides persistent caching across server restarts.
 * 
 * This module is in $lib/server/ so it can only be imported server-side.
 */

import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import * as fs from 'fs';
import * as path from 'path';

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
	// Weather
	WEATHER_FORECAST: 60 * 60 * 1000,          // 1 hour
	WEATHER_HISTORICAL: 24 * 60 * 60 * 1000,   // 24 hours
	WEATHER_PREDICTION: 6 * 60 * 60 * 1000,    // 6 hours
	// Flights
	FLIGHT_ROUTE: 6 * 60 * 60 * 1000,          // 6 hours (schedules can change)
	FLIGHT_STATUS: 60 * 60 * 1000,             // 1 hour (for day-of status)
	AIRLINE_SEARCH: 30 * 24 * 60 * 60 * 1000,  // 30 days (rarely changes)
	AIRPORT_DATA: 30 * 24 * 60 * 60 * 1000,    // 30 days (rarely changes)
	// Routing
	ROUTING: 7 * 24 * 60 * 60 * 1000,          // 7 days
	// Geocoding & Cities (Geoapify)
	CITY_SEARCH: 30 * 24 * 60 * 60 * 1000,     // 30 days (city data rarely changes)
	GEOCODING: 30 * 24 * 60 * 60 * 1000,       // 30 days (addresses don't move)
	TIMEZONE: 365 * 24 * 60 * 60 * 1000,       // 1 year (timezone boundaries stable)
	// Places (Foursquare)
	PLACES_FOOD: 7 * 24 * 60 * 60 * 1000,      // 7 days (restaurants may change)
	PLACES_ATTRACTIONS: 14 * 24 * 60 * 60 * 1000,  // 14 days (attractions more stable)
	PLACE_DETAILS: 14 * 24 * 60 * 60 * 1000    // 14 days (individual place details)
} as const;

export type CacheType = keyof typeof CACHE_TTL;

interface CacheEntry {
	key: string;
	value: string;
	type: string;
	expires_at: number;
	created_at: number;
}

let db: Database.Database | null = null;

/**
 * Ensure the database directory exists (runs once).
 */
function ensureDbDirectory(dbPath: string): void {
	const dir = path.dirname(dbPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * Check if we're in build mode (no-op for cache operations).
 */
function isBuildTime(): boolean {
	return building;
}

/**
 * Initialize the database connection and create tables if needed.
 * Safe to call multiple times - will reuse existing connection.
 * Returns null during build time to enable no-op pattern.
 * 
 * NOTE: This function runs synchronously at first request after server start.
 * The directory creation is sync but only runs once. For production deployments,
 * ensure the data directory exists at container/server startup time to avoid
 * any brief stall on first request. The Dockerfile handles this automatically.
 */
function getDb(): Database.Database | null {
	if (db) return db;

	// Return null during build - cache operations become no-ops
	if (isBuildTime()) {
		return null;
	}

	const dbPath = env.DATABASE_PATH || './data/cache.db';
	
	// Ensure directory exists (sync, but only runs once at startup)
	// Use a synchronous lock pattern: check db again after directory creation
	// to handle concurrent calls during startup
	if (!db) {
		ensureDbDirectory(dbPath);
		
		// Double-check after directory creation in case another call initialized db
		if (db) return db;
		
		db = new Database(dbPath);
		
		// Enable WAL mode for better concurrent access
		db.pragma('journal_mode = WAL');
		
		// Create cache table if it doesn't exist
		db.exec(`
			CREATE TABLE IF NOT EXISTS cache (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				type TEXT NOT NULL,
				expires_at INTEGER NOT NULL,
				created_at INTEGER NOT NULL
			);
			
			CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
			CREATE INDEX IF NOT EXISTS idx_cache_type ON cache(type);
		`);

		// Run cleanup on startup
		cleanupExpired();
	}

	return db;
}

/**
 * Get a cached value by key.
 * Returns null if not found, expired, or during build.
 */
export function get<T>(key: string): T | null {
	const db = getDb();
	if (!db) return null; // No-op during build
	
	const now = Date.now();

	const stmt = db.prepare<[string, number], CacheEntry>(
		'SELECT * FROM cache WHERE key = ? AND expires_at > ?'
	);
	const row = stmt.get(key, now);

	if (!row) return null;

	try {
		return JSON.parse(row.value) as T;
	} catch {
		// Invalid JSON, remove the entry
		del(key);
		return null;
	}
}

/**
 * Get multiple cached values by keys.
 * Returns a Map of found entries (missing/expired keys are omitted).
 */
export function getMany<T>(keys: string[]): Map<string, T> {
	if (keys.length === 0) return new Map();

	const db = getDb();
	if (!db) return new Map(); // No-op during build
	
	const now = Date.now();
	const results = new Map<string, T>();

	// Use parameterized query for safety
	const placeholders = keys.map(() => '?').join(',');
	const stmt = db.prepare<unknown[], CacheEntry>(
		`SELECT * FROM cache WHERE key IN (${placeholders}) AND expires_at > ?`
	);
	const rows = stmt.all(...keys, now);

	for (const row of rows) {
		try {
			results.set(row.key, JSON.parse(row.value) as T);
		} catch {
			// Skip invalid entries
		}
	}

	return results;
}

/**
 * Set a cached value with TTL.
 * No-op during build.
 */
export function set<T>(key: string, value: T, type: CacheType): void {
	const db = getDb();
	if (!db) return; // No-op during build
	
	const now = Date.now();
	const ttl = CACHE_TTL[type];
	const expiresAt = now + ttl;

	const stmt = db.prepare(`
		INSERT OR REPLACE INTO cache (key, value, type, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	stmt.run(key, JSON.stringify(value), type, expiresAt, now);
}

/**
 * Set multiple cached values at once.
 * No-op during build.
 */
export function setMany<T>(entries: Array<{ key: string; value: T }>, type: CacheType): void {
	if (entries.length === 0) return;

	const db = getDb();
	if (!db) return; // No-op during build
	
	const now = Date.now();
	const ttl = CACHE_TTL[type];
	const expiresAt = now + ttl;

	const stmt = db.prepare(`
		INSERT OR REPLACE INTO cache (key, value, type, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	const insertMany = db.transaction((items: Array<{ key: string; value: T }>) => {
		for (const item of items) {
			stmt.run(item.key, JSON.stringify(item.value), type, expiresAt, now);
		}
	});

	insertMany(entries);
}

/**
 * Delete a cached entry.
 * No-op during build.
 */
export function del(key: string): void {
	const db = getDb();
	if (!db) return; // No-op during build
	db.prepare('DELETE FROM cache WHERE key = ?').run(key);
}

/**
 * Check if a key exists and is not expired.
 * Returns false during build.
 */
export function has(key: string): boolean {
	const db = getDb();
	if (!db) return false; // No-op during build
	
	const now = Date.now();
	const stmt = db.prepare<[string, number], { count: number }>(
		'SELECT COUNT(*) as count FROM cache WHERE key = ? AND expires_at > ?'
	);
	const row = stmt.get(key, now);
	return (row?.count ?? 0) > 0;
}

/**
 * Remove all expired entries.
 * Returns 0 during build.
 */
export function cleanupExpired(): number {
	const db = getDb();
	if (!db) return 0; // No-op during build
	
	const now = Date.now();
	const result = db.prepare('DELETE FROM cache WHERE expires_at <= ?').run(now);
	return result.changes;
}

/**
 * Get cache statistics.
 * Returns empty stats during build.
 */
export function getStats(): { total: number; byType: Record<string, number> } {
	const db = getDb();
	if (!db) return { total: 0, byType: {} }; // No-op during build
	
	const now = Date.now();

	const totalStmt = db.prepare<[number], { count: number }>(
		'SELECT COUNT(*) as count FROM cache WHERE expires_at > ?'
	);
	const total = totalStmt.get(now)?.count ?? 0;

	const byTypeStmt = db.prepare<[number], { type: string; count: number }>(
		'SELECT type, COUNT(*) as count FROM cache WHERE expires_at > ? GROUP BY type'
	);
	const byTypeRows = byTypeStmt.all(now);
	const byType: Record<string, number> = {};
	for (const row of byTypeRows) {
		byType[row.type] = row.count;
	}

	return { total, byType };
}

/**
 * Clear all cache entries.
 * No-op during build.
 */
export function clear(): void {
	const db = getDb();
	if (!db) return; // No-op during build
	db.prepare('DELETE FROM cache').run();
}

/**
 * Clear cache entries by type.
 * No-op during build.
 */
export function clearByType(type: CacheType): void {
	const db = getDb();
	if (!db) return; // No-op during build
	db.prepare('DELETE FROM cache WHERE type = ?').run(type);
}

/**
 * Generate a cache key for weather data.
 * 
 * Coordinates are rounded to 2 decimal places (~1.1km precision at equator).
 * This is intentional for weather data because:
 * - Weather conditions are consistent within ~1km areas
 * - Reduces cache fragmentation for nearby locations (hotels, restaurants in same city)
 * - Weather APIs like Open-Meteo use similar grid resolutions
 * 
 * For higher precision needs (e.g., routing), use routingCacheKey instead.
 */
export function weatherCacheKey(lat: number, lon: number, date: string, type: 'forecast' | 'historical' | 'prediction'): string {
	// 2 decimal places = ~1.1km precision at equator, ~0.7km at 50° latitude
	const roundedLat = Math.round(lat * 100) / 100;
	const roundedLon = Math.round(lon * 100) / 100;
	return `weather:${type}:${roundedLat}:${roundedLon}:${date}`;
}

/**
 * Generate a cache key for flight routes.
 */
export function flightCacheKey(callsign: string): string {
	return `flight:route:${callsign.toUpperCase()}`;
}

/**
 * Generate a cache key for flight status (flight number + date).
 */
export function flightStatusCacheKey(flightNumber: string, date: string): string {
	return `flight:status:${flightNumber.toUpperCase()}:${date}`;
}

/**
 * Generate a cache key for airline searches.
 */
export function airlineCacheKey(query: string): string {
	return `airline:search:${query.toUpperCase()}`;
}

/**
 * Generate a cache key for airport data.
 */
export function airportCacheKey(code: string): string {
	return `airport:${code.toUpperCase()}`;
}

/**
 * Generate a cache key for routing.
 */
export function routingCacheKey(fromLat: number, fromLon: number, toLat: number, toLon: number, mode: string): string {
	// Round to 5 decimal places (~1m precision)
	const round = (n: number) => Math.round(n * 100000) / 100000;
	return `routing:${mode}:${round(fromLat)},${round(fromLon)}:${round(toLat)},${round(toLon)}`;
}

/**
 * Generate a cache key for city search.
 */
export function cityCacheKey(query: string, limit: number): string {
	return `city:${query.toLowerCase().trim()}:${limit}`;
}

/**
 * Generate a cache key for geocoding.
 */
export function geocodeCacheKey(address: string): string {
	return `geocode:${address.toLowerCase().trim()}`;
}

/**
 * Generate a cache key for reverse geocoding.
 */
export function reverseGeocodeCacheKey(lat: number, lon: number): string {
	// Round to 5 decimal places (~1m precision)
	const roundedLat = Math.round(lat * 100000) / 100000;
	const roundedLon = Math.round(lon * 100000) / 100000;
	return `reverse-geocode:${roundedLat}:${roundedLon}`;
}

/**
 * Generate a cache key for timezone lookup.
 */
export function timezoneCacheKey(lat: number, lon: number): string {
	// Round to 2 decimal places (~1km precision - timezone is consistent within this)
	const roundedLat = Math.round(lat * 100) / 100;
	const roundedLon = Math.round(lon * 100) / 100;
	return `timezone:${roundedLat}:${roundedLon}`;
}

/**
 * Generate a cache key for food venue search.
 */
export function foodPlacesCacheKey(lat: number, lon: number, query?: string): string {
	// Round to 3 decimal places (~100m precision)
	const roundedLat = Math.round(lat * 1000) / 1000;
	const roundedLon = Math.round(lon * 1000) / 1000;
	const queryPart = query ? `:${query.toLowerCase().trim()}` : '';
	return `places:food:${roundedLat}:${roundedLon}${queryPart}`;
}

/**
 * Generate a cache key for attraction search.
 */
export function attractionPlacesCacheKey(lat: number, lon: number, query?: string): string {
	// Round to 3 decimal places (~100m precision)
	const roundedLat = Math.round(lat * 1000) / 1000;
	const roundedLon = Math.round(lon * 1000) / 1000;
	const queryPart = query ? `:${query.toLowerCase().trim()}` : '';
	return `places:attractions:${roundedLat}:${roundedLon}${queryPart}`;
}

/**
 * Generate a cache key for place details.
 */
export function placeDetailsCacheKey(fsqId: string): string {
	return `places:details:${fsqId}`;
}

// Export as a cache service object
export const cache = {
	get,
	getMany,
	set,
	setMany,
	del,
	has,
	cleanupExpired,
	getStats,
	clear,
	clearByType,
	// Key generators
	weatherCacheKey,
	flightCacheKey,
	flightStatusCacheKey,
	airlineCacheKey,
	airportCacheKey,
	routingCacheKey,
	cityCacheKey,
	geocodeCacheKey,
	reverseGeocodeCacheKey,
	timezoneCacheKey,
	foodPlacesCacheKey,
	attractionPlacesCacheKey,
	placeDetailsCacheKey,
	// TTL constants
	TTL: CACHE_TTL
};
