/**
 * IP-based rate limiter for API endpoints.
 * Uses in-memory storage with sliding window algorithm.
 * 
 * This module is in $lib/server/ so it can only be imported server-side.
 */

import { env } from '$env/dynamic/private';

interface RateLimitEntry {
	count: number;
	windowStart: number;
}

// In-memory store for rate limit tracking
// Key format: `${ip}:${endpoint}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configuration
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;

// Endpoint-specific limits
type EndpointType = 'weather' | 'flights' | 'routing' | 'default';

function getMaxRequests(endpoint: EndpointType): number {
	switch (endpoint) {
		case 'weather':
			return parseInt(env.RATE_LIMIT_MAX_WEATHER || '100', 10);
		case 'flights':
			return parseInt(env.RATE_LIMIT_MAX_FLIGHTS || '50', 10);
		case 'routing':
			return parseInt(env.RATE_LIMIT_MAX_ROUTING || '200', 10);
		default:
			return DEFAULT_MAX_REQUESTS;
	}
}

function getWindowMs(): number {
	return parseInt(env.RATE_LIMIT_WINDOW_MS || String(DEFAULT_WINDOW_MS), 10);
}

/**
 * Check if a request should be rate limited.
 * Returns true if the request is allowed, false if it should be blocked.
 * 
 * Uses atomic check-and-increment to prevent race conditions where
 * concurrent requests could exceed the rate limit.
 */
export function checkRateLimit(ip: string, endpoint: EndpointType = 'default'): boolean {
	const key = `${ip}:${endpoint}`;
	const now = Date.now();
	const windowMs = getWindowMs();
	const maxRequests = getMaxRequests(endpoint);

	const entry = rateLimitStore.get(key);

	if (!entry || now - entry.windowStart > windowMs) {
		// Start a new window
		rateLimitStore.set(key, { count: 1, windowStart: now });
		return true;
	}

	// Atomic check-and-increment: increment first, then check if over limit
	const newCount = ++entry.count;
	if (newCount > maxRequests) {
		// Rate limit exceeded (don't decrement - count reflects actual attempts)
		return false;
	}

	return true;
}

/**
 * Get rate limit info for a client.
 * Returns remaining requests and reset time.
 */
export function getRateLimitInfo(ip: string, endpoint: EndpointType = 'default'): {
	remaining: number;
	resetAt: number;
	limit: number;
} {
	const key = `${ip}:${endpoint}`;
	const now = Date.now();
	const windowMs = getWindowMs();
	const maxRequests = getMaxRequests(endpoint);

	const entry = rateLimitStore.get(key);

	if (!entry || now - entry.windowStart > windowMs) {
		return {
			remaining: maxRequests,
			resetAt: now + windowMs,
			limit: maxRequests
		};
	}

	return {
		remaining: Math.max(0, maxRequests - entry.count),
		resetAt: entry.windowStart + windowMs,
		limit: maxRequests
	};
}

/**
 * Add rate limit headers to a response.
 */
export function getRateLimitHeaders(ip: string, endpoint: EndpointType = 'default'): Record<string, string> {
	const info = getRateLimitInfo(ip, endpoint);
	return {
		'X-RateLimit-Limit': String(info.limit),
		'X-RateLimit-Remaining': String(info.remaining),
		'X-RateLimit-Reset': String(Math.ceil(info.resetAt / 1000))
	};
}

/**
 * Clean up old entries from the rate limit store.
 * Should be called periodically to prevent memory leaks.
 */
export function cleanupRateLimitStore(): number {
	const now = Date.now();
	const windowMs = getWindowMs();
	let removed = 0;

	for (const [key, entry] of rateLimitStore) {
		if (now - entry.windowStart > windowMs * 2) {
			rateLimitStore.delete(key);
			removed++;
		}
	}

	return removed;
}

// Cleanup every 5 minutes
// Use unref() to allow Node.js process to exit gracefully without waiting for this timer
const cleanupInterval = setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
cleanupInterval.unref();

/**
 * Reset rate limit for a specific IP (useful for testing).
 */
export function resetRateLimit(ip: string, endpoint?: EndpointType): void {
	if (endpoint) {
		rateLimitStore.delete(`${ip}:${endpoint}`);
	} else {
		// Remove all entries for this IP
		for (const key of rateLimitStore.keys()) {
			if (key.startsWith(`${ip}:`)) {
				rateLimitStore.delete(key);
			}
		}
	}
}

/**
 * Extract client IP from request, handling reverse proxy scenarios.
 * 
 * When behind a reverse proxy (nginx, cloudflare, etc.), the real client IP
 * is typically in X-Forwarded-For or X-Real-IP headers. This function checks
 * these headers first, falling back to getClientAddress().
 * 
 * IMPORTANT: Only trust these headers if you're behind a trusted proxy.
 * Set TRUST_PROXY=true in your environment when running behind a reverse proxy.
 * 
 * @param request - The incoming request object
 * @param getClientAddress - SvelteKit's getClientAddress function
 */
export function getClientIp(request: Request, getClientAddress: () => string): string {
	const trustProxy = env.TRUST_PROXY === 'true';
	
	if (trustProxy) {
		// X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
		// The first one is the original client IP
		const forwardedFor = request.headers.get('x-forwarded-for');
		if (forwardedFor) {
			const firstIp = forwardedFor.split(',')[0].trim();
			if (firstIp) return firstIp;
		}
		
		// X-Real-IP is typically set by nginx
		const realIp = request.headers.get('x-real-ip');
		if (realIp) return realIp.trim();
	}
	
	// Fall back to SvelteKit's getClientAddress
	return getClientAddress();
}

// Export as a rate limiter object
export const rateLimit = {
	check: checkRateLimit,
	getInfo: getRateLimitInfo,
	getHeaders: getRateLimitHeaders,
	cleanup: cleanupRateLimitStore,
	reset: resetRateLimit,
	getClientIp
};
