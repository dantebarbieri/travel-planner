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
	WEATHER_FORECAST: 60 * 60 * 1000,          // 1 hour
	WEATHER_HISTORICAL: 24 * 60 * 60 * 1000,   // 24 hours
	WEATHER_PREDICTION: 6 * 60 * 60 * 1000,    // 6 hours
	FLIGHT_ROUTE: 6 * 60 * 60 * 1000,          // 6 hours (schedules can change)
	FLIGHT_STATUS: 60 * 60 * 1000,             // 1 hour (for day-of status)
	AIRLINE_SEARCH: 30 * 24 * 60 * 60 * 1000,  // 30 days (rarely changes)
	AIRPORT_DATA: 30 * 24 * 60 * 60 * 1000,    // 30 days (rarely changes)
	ROUTING: 7 * 24 * 60 * 60 * 1000           // 7 days
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
 * Initialize the database connection and create tables if needed.
 * Safe to call multiple times - will reuse existing connection.
 */
function getDb(): Database.Database {
	if (db) return db;

	// Don't initialize DB during build
	if (building) {
		throw new Error('Cannot access database during build');
	}

	const dbPath = env.DATABASE_PATH || './data/cache.db';
	
	// Ensure directory exists
	const dir = path.dirname(dbPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

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

	return db;
}

/**
 * Get a cached value by key.
 * Returns null if not found or expired.
 */
export function get<T>(key: string): T | null {
	const db = getDb();
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
 */
export function set<T>(key: string, value: T, type: CacheType): void {
	const db = getDb();
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
 */
export function setMany<T>(entries: Array<{ key: string; value: T }>, type: CacheType): void {
	if (entries.length === 0) return;

	const db = getDb();
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
 */
export function del(key: string): void {
	const db = getDb();
	db.prepare('DELETE FROM cache WHERE key = ?').run(key);
}

/**
 * Check if a key exists and is not expired.
 */
export function has(key: string): boolean {
	const db = getDb();
	const now = Date.now();
	const stmt = db.prepare<[string, number], { count: number }>(
		'SELECT COUNT(*) as count FROM cache WHERE key = ? AND expires_at > ?'
	);
	const row = stmt.get(key, now);
	return (row?.count ?? 0) > 0;
}

/**
 * Remove all expired entries.
 */
export function cleanupExpired(): number {
	const db = getDb();
	const now = Date.now();
	const result = db.prepare('DELETE FROM cache WHERE expires_at <= ?').run(now);
	return result.changes;
}

/**
 * Get cache statistics.
 */
export function getStats(): { total: number; byType: Record<string, number> } {
	const db = getDb();
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
 */
export function clear(): void {
	const db = getDb();
	db.prepare('DELETE FROM cache').run();
}

/**
 * Clear cache entries by type.
 */
export function clearByType(type: CacheType): void {
	const db = getDb();
	db.prepare('DELETE FROM cache WHERE type = ?').run(type);
}

/**
 * Generate a cache key for weather data.
 */
export function weatherCacheKey(lat: number, lon: number, date: string, type: 'forecast' | 'historical' | 'prediction'): string {
	// Round coords to 2 decimal places for cache efficiency
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
	// TTL constants
	TTL: CACHE_TTL
};
