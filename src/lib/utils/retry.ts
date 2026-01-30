/**
 * Exponential backoff retry utility.
 * Works in both browser and Node.js environments.
 */

export interface RetryOptions {
	/** Maximum number of retry attempts (default: 4) */
	maxAttempts?: number;
	/** Initial delay in milliseconds (default: 1000) */
	initialDelayMs?: number;
	/** Maximum delay in milliseconds (default: 8000) */
	maxDelayMs?: number;
	/** Multiplier for exponential backoff (default: 2) */
	backoffMultiplier?: number;
	/** Function to determine if an error is retryable (default: checks for 429/503) */
	isRetryable?: (error: unknown) => boolean;
	/** Callback when a retry is about to happen */
	onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export interface RetryResult<T> {
	success: boolean;
	data?: T;
	error?: unknown;
	attempts: number;
}

/**
 * HTTP error with status code and optional Retry-After header.
 */
export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly retryAfter?: number
	) {
		super(message);
		this.name = 'HttpError';
	}
}

/**
 * Default function to check if an error is retryable.
 * Returns true for rate limit (429) and service unavailable (503) errors.
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof HttpError) {
		return error.status === 429 || error.status === 503;
	}
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
	}
	return false;
}

/**
 * Parse Retry-After header value.
 * Can be a number of seconds or an HTTP-date.
 */
export function parseRetryAfter(value: string | null): number | null {
	if (!value) return null;

	// Try parsing as number of seconds
	const seconds = parseInt(value, 10);
	if (!isNaN(seconds) && seconds > 0) {
		return seconds * 1000; // Convert to milliseconds
	}

	// Try parsing as HTTP-date
	const date = new Date(value);
	if (!isNaN(date.getTime())) {
		const delayMs = date.getTime() - Date.now();
		return delayMs > 0 ? delayMs : null;
	}

	return null;
}

/**
 * Calculate delay for a given attempt using exponential backoff.
 */
function calculateDelay(
	attempt: number,
	initialDelayMs: number,
	maxDelayMs: number,
	backoffMultiplier: number,
	retryAfterMs?: number
): number {
	// If Retry-After header provided, use it (capped at maxDelayMs)
	if (retryAfterMs !== undefined && retryAfterMs > 0) {
		return Math.min(retryAfterMs, maxDelayMs);
	}

	// Exponential backoff: initialDelay * multiplier^(attempt-1)
	const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);

	// Add jitter (±10%) to prevent thundering herd
	const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1);

	return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic.
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise with the result or final error
 * 
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   async () => {
 *     const response = await fetch(url);
 *     if (!response.ok) {
 *       throw new HttpError(response.status, 'API error');
 *     }
 *     return response.json();
 *   },
 *   { maxAttempts: 4, onRetry: (attempt, delay) => console.log(`Retrying in ${delay}ms...`) }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxAttempts = 4,
		initialDelayMs = 1000,
		maxDelayMs = 8000,
		backoffMultiplier = 2,
		isRetryable = isRetryableError,
		onRetry
	} = options;

	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Check if we should retry
			if (attempt >= maxAttempts || !isRetryable(error)) {
				throw error;
			}

			// Calculate delay (check for Retry-After header)
			const retryAfterMs = error instanceof HttpError ? error.retryAfter : undefined;
			const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier, retryAfterMs);

			// Notify of retry
			if (onRetry) {
				onRetry(attempt, delayMs, error);
			}

			// Wait before retrying
			await sleep(delayMs);
		}
	}

	// Should not reach here, but TypeScript needs this
	throw lastError;
}

/**
 * Wrap a fetch call with retry logic.
 * Automatically handles 429 and 503 responses.
 * 
 * @param url - The URL to fetch
 * @param init - Fetch init options
 * @param retryOptions - Retry configuration options
 * @returns Promise with the Response
 */
export async function fetchWithRetry(
	url: string,
	init?: RequestInit,
	retryOptions: RetryOptions = {}
): Promise<Response> {
	return retryWithBackoff(
		async () => {
			const response = await fetch(url, init);

			if (response.status === 429 || response.status === 503) {
				const retryAfterHeader = response.headers.get('Retry-After');
				const retryAfterMs = parseRetryAfter(retryAfterHeader) ?? undefined;
				throw new HttpError(response.status, `HTTP ${response.status}`, retryAfterMs);
			}

			return response;
		},
		{
			onRetry: (attempt, delayMs) => {
				console.log(`[Retry] Attempt ${attempt} failed for ${url}, retrying in ${delayMs}ms...`);
			},
			...retryOptions
		}
	);
}
