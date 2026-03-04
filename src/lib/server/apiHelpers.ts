/**
 * Shared helpers for API endpoint boilerplate.
 * Extracts common rate limiting and error handling patterns
 * so each endpoint only contains its unique business logic.
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { rateLimit, type EndpointType } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

/** Context passed to API handler functions. */
export interface ApiContext {
	url: URL;
	request: Request;
	getClientAddress: () => string;
	/** Pre-resolved client IP address. */
	ip: string;
	/** Returns rate limit headers for the current request. */
	headers: () => Record<string, string>;
}

/**
 * Create a SvelteKit GET handler with rate limiting and error handling.
 *
 * Handles:
 * - Client IP extraction
 * - Rate limit checking (returns 429 when exceeded)
 * - Outer try/catch with consistent error logging
 *
 * @param endpoint - The rate limit endpoint type
 * @param logTag - Tag for logger calls (e.g., 'CitiesAPI')
 * @param fallbackError - Error message for unhandled exceptions
 * @param handler - The endpoint's business logic
 */
export function createApiHandler(
	endpoint: EndpointType,
	logTag: string,
	fallbackError: string,
	handler: (ctx: ApiContext) => Promise<Response>
): (event: RequestEvent) => Promise<Response> {
	return async (event: RequestEvent): Promise<Response> => {
		const { url, request, getClientAddress } = event;
		const ip = rateLimit.getClientIp(request, getClientAddress);

		if (!rateLimit.check(ip, endpoint)) {
			return json(
				{ error: 'Too many requests' },
				{ status: 429, headers: rateLimit.getHeaders(ip, endpoint) }
			);
		}

		try {
			return await handler({
				url,
				request,
				getClientAddress,
				ip,
				headers: () => rateLimit.getHeaders(ip, endpoint)
			});
		} catch (err) {
			logger.error(logTag, `${fallbackError}:`, err);
			return json(
				{ error: fallbackError },
				{ status: 500, headers: rateLimit.getHeaders(ip, endpoint) }
			);
		}
	};
}
