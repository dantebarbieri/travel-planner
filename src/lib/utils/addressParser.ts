/**
 * Simple address parser for extracting city/state/country from address strings.
 * Used as a fallback when geocoding fails.
 */

export interface ParsedAddress {
	street?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	country?: string;
}

// US state abbreviations
const US_STATES = new Set([
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
	'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
	'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
	'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
	'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

// Common country names/codes
const COUNTRIES = new Map([
	['USA', 'United States'],
	['US', 'United States'],
	['UNITED STATES', 'United States'],
	['UK', 'United Kingdom'],
	['UNITED KINGDOM', 'United Kingdom'],
	['GB', 'United Kingdom'],
	['CANADA', 'Canada'],
	['CA', 'Canada'], // Note: also a US state, context matters
	['MEXICO', 'Mexico'],
	['MX', 'Mexico'],
	['AUSTRALIA', 'Australia'],
	['AU', 'Australia'],
	['JAPAN', 'Japan'],
	['JP', 'Japan'],
	['GERMANY', 'Germany'],
	['DE', 'Germany'],
	['FRANCE', 'France'],
	['FR', 'France'],
	['ITALY', 'Italy'],
	['IT', 'Italy'],
	['SPAIN', 'Spain'],
	['ES', 'Spain']
]);

/**
 * Parse a US-style address string into components.
 * Handles formats like:
 * - "400 Cannery Row, Monterey, CA 93940"
 * - "123 Main St, San Francisco, CA"
 * - "New York, NY, USA"
 */
export function parseAddress(address: string): ParsedAddress {
	const result: ParsedAddress = {};

	if (!address || address.trim().length === 0) {
		return result;
	}

	// Split by commas and clean up
	const parts = address.split(',').map((p) => p.trim()).filter((p) => p.length > 0);

	if (parts.length === 0) {
		return result;
	}

	// Check last part for country (only if it's clearly a country, not a US state)
	const lastPart = parts[parts.length - 1].toUpperCase();
	if (COUNTRIES.has(lastPart) && !US_STATES.has(lastPart)) {
		result.country = COUNTRIES.get(lastPart) || parts[parts.length - 1];
		parts.pop();
	}

	// Process remaining parts
	if (parts.length === 0) {
		return result;
	}

	// Check for "State ZIP" or just "State" pattern in last remaining part
	if (parts.length > 0) {
		const lastRemaining = parts[parts.length - 1];

		// Match "CA 93940" or "CA 93940-1234"
		const stateZipMatch = lastRemaining.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
		// Match just "CA"
		const stateOnlyMatch = lastRemaining.match(/^([A-Z]{2})$/i);

		if (stateZipMatch) {
			const stateCode = stateZipMatch[1].toUpperCase();
			if (US_STATES.has(stateCode)) {
				result.state = stateCode;
				result.postalCode = stateZipMatch[2];
				parts.pop();
			}
		} else if (stateOnlyMatch) {
			const stateCode = stateOnlyMatch[1].toUpperCase();
			if (US_STATES.has(stateCode)) {
				result.state = stateCode;
				parts.pop();
			}
		}
	}

	// Remaining parts: typically [street, city] or [city]
	if (parts.length >= 2) {
		result.street = parts[0];
		result.city = parts[1];
	} else if (parts.length === 1) {
		// Could be just a city or just a street - assume city
		result.city = parts[0];
	}

	// Default country to United States if we detected a US state
	if (result.state && US_STATES.has(result.state) && !result.country) {
		result.country = 'United States';
	}

	return result;
}

/**
 * Create a formatted address string from parsed components.
 */
export function formatParsedAddress(parsed: ParsedAddress): string {
	const parts: string[] = [];

	if (parsed.street) parts.push(parsed.street);
	if (parsed.city) parts.push(parsed.city);
	if (parsed.state && parsed.postalCode) {
		parts.push(`${parsed.state} ${parsed.postalCode}`);
	} else if (parsed.state) {
		parts.push(parsed.state);
	} else if (parsed.postalCode) {
		parts.push(parsed.postalCode);
	}
	if (parsed.country) parts.push(parsed.country);

	return parts.join(', ');
}
