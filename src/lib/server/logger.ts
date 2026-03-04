/**
 * Server-side logger utility.
 * Gates debug/info messages behind NODE_ENV check to prevent
 * leaking verbose output in production. Warn/error always log.
 *
 * Usage:
 *   import { logger } from '$lib/server/logger';
 *   logger.debug('Foursquare', 'Retry attempt 2, waiting 500ms...');
 *   logger.error('Weather', 'API error:', error.message);
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
	debug(tag: string, message: string, ...args: unknown[]) {
		if (isDev) console.debug(`[${tag}]`, message, ...args);
	},
	info(tag: string, message: string, ...args: unknown[]) {
		if (isDev) console.info(`[${tag}]`, message, ...args);
	},
	warn(tag: string, message: string, ...args: unknown[]) {
		console.warn(`[${tag}]`, message, ...args);
	},
	error(tag: string, message: string, ...args: unknown[]) {
		console.error(`[${tag}]`, message, ...args);
	}
};
