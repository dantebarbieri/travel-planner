/**
 * URL validation utilities for safe external link handling.
 *
 * Provides protection against unsafe URL schemes (e.g., javascript:, data:)
 * that could execute arbitrary code when opened.
 */

/** Allowlist of safe URL protocols */
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Check if a URL has a safe protocol (http: or https:).
 * Uses the Web Standards URL API for parsing.
 *
 * @param url - The URL string to validate
 * @returns true if the URL is safe to open, false otherwise
 *
 * @example
 * isSafeUrl('https://example.com') // true
 * isSafeUrl('javascript:alert(1)') // false
 * isSafeUrl('data:text/html,...')  // false
 */
export function isSafeUrl(url: string | null | undefined): boolean {
	if (!url) return false;

	try {
		const parsed = new URL(url);
		return SAFE_PROTOCOLS.has(parsed.protocol);
	} catch {
		// Invalid URL
		return false;
	}
}

/**
 * Log a warning if a URL is unsafe. Use at data ingestion time
 * to flag potentially malicious URLs from external sources.
 *
 * @param url - The URL to check
 * @param context - Description of where the URL came from (e.g., "Foursquare venue.website")
 * @returns true if the URL is safe, false if unsafe (and warning was logged)
 *
 * @example
 * warnIfUnsafeUrl(venue.website, 'Foursquare venue.website');
 */
export function warnIfUnsafeUrl(url: string | null | undefined, context: string): boolean {
	if (!url) return true; // No URL is not unsafe, just absent

	if (!isSafeUrl(url)) {
		console.warn(
			`[Security] Unsafe URL detected in ${context}: "${url.slice(0, 100)}${url.length > 100 ? '..' : ''}". ` +
			`Only http: and https: protocols are allowed.`
		);
		return false;
	}
	return true;
}

/**
 * Safely open a URL in a new window/tab. Validates the URL protocol
 * and blocks navigation for unsafe URLs, logging a warning.
 *
 * @param url - The URL to open
 * @param target - Window target (default: '_blank')
 * @returns true if the URL was opened, false if blocked
 *
 * @example
 * openSafeUrl('https://example.com'); // Opens in new tab, returns true
 * openSafeUrl('javascript:alert(1)'); // Blocked, logs warning, returns false
 */
export function openSafeUrl(url: string | null | undefined, target: string = '_blank'): boolean {
	if (!url) return false;

	if (!isSafeUrl(url)) {
		console.warn(
			`[Security] Blocked attempt to open unsafe URL: "${url.slice(0, 100)}${url.length > 100 ? '...' : ''}". ` +
			`Only http: and https: protocols are allowed.`
		);
		return false;
	}

	window.open(url, target);
	return true;
}
