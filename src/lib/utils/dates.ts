// ============ Core Date Parsing ============
// These must be defined first as other functions depend on them

export function parseISODate(isoDate: string): Date {
	return new Date(isoDate + 'T00:00:00');
}

export function toISODateString(date: Date): string {
	// Use local date components to avoid UTC conversion issues
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// ============ Date Formatting ============

export function formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
	const date = parseISODate(isoDate);
	return date.toLocaleDateString(
		'en-US',
		options ?? {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}
	);
}

export function formatDateShort(isoDate: string): string {
	return formatDate(isoDate, {
		month: 'short',
		day: 'numeric'
	});
}

export function formatDayOfWeek(isoDate: string): string {
	const date = parseISODate(isoDate);
	return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatTime(time: string, use24h: boolean = false): string {
	const [hours, minutes] = time.split(':').map(Number);
	if (use24h) {
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	}
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============ Date Arithmetic ============

export function addDays(isoDate: string, days: number): string {
	const date = parseISODate(isoDate);
	date.setDate(date.getDate() + days);
	return toISODateString(date);
}

export function daysBetween(startDate: string, endDate: string): number {
	const start = parseISODate(startDate);
	const end = parseISODate(endDate);
	const diffTime = end.getTime() - start.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
	const dates: string[] = [];
	const days = daysBetween(startDate, endDate);
	for (let i = 0; i <= days; i++) {
		dates.push(addDays(startDate, i));
	}
	return dates;
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
	const d = parseISODate(date).getTime();
	const start = parseISODate(startDate).getTime();
	const end = parseISODate(endDate).getTime();
	return d >= start && d <= end;
}

export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (mins === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${mins}m`;
}

export function formatDistance(km: number, unit: 'km' | 'miles' = 'km'): string {
	if (unit === 'miles') {
		const miles = km * 0.621371;
		if (miles < 0.1) {
			return `${Math.round(miles * 5280)} ft`;
		}
		return `${miles.toFixed(1)} mi`;
	}
	if (km < 1) {
		return `${Math.round(km * 1000)} m`;
	}
	return `${km.toFixed(1)} km`;
}

export function getDayNumber(tripStartDate: string, currentDate: string): number {
	return daysBetween(tripStartDate, currentDate) + 1;
}

export function isToday(isoDate: string): boolean {
	return toISODateString(new Date()) === isoDate;
}

export function isPast(isoDate: string): boolean {
	return parseISODate(isoDate).getTime() < new Date().setHours(0, 0, 0, 0);
}

export function isFuture(isoDate: string): boolean {
	return parseISODate(isoDate).getTime() > new Date().setHours(23, 59, 59, 999);
}

/**
 * Get timezone abbreviation for a given IANA timezone (e.g., "America/New_York" -> "EST" or "EDT")
 * Uses a specific date to account for daylight saving time
 */
export function getTimezoneAbbreviation(timezone: string, date?: Date): string {
	const d = date || new Date();
	try {
		// Get timezone name parts from the formatted string
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'short'
		});
		const parts = formatter.formatToParts(d);
		const tzPart = parts.find((p) => p.type === 'timeZoneName');
		return tzPart?.value || timezone;
	} catch {
		// Fallback to the timezone identifier if formatting fails
		return timezone.split('/').pop() || timezone;
	}
}

/**
 * Get UTC offset for a timezone (e.g., "America/New_York" -> "UTC-5" or "UTC-4")
 * Uses a specific date to account for daylight saving time
 */
export function getTimezoneOffset(timezone: string, date?: Date): string {
	const d = date || new Date();
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'longOffset'
		});
		const parts = formatter.formatToParts(d);
		const tzPart = parts.find((p) => p.type === 'timeZoneName');
		// Typical output is "GMT-05:00" - convert to "UTC-5"
		if (tzPart?.value) {
			const match = tzPart.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
			if (match) {
				const sign = match[1];
				const hours = parseInt(match[2], 10);
				const minutes = match[3] ? parseInt(match[3], 10) : 0;
				if (minutes === 0) {
					return hours === 0 ? 'UTC' : `UTC${sign}${hours}`;
				}
				return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
			}
		}
		return 'UTC';
	} catch {
		return 'UTC';
	}
}

/**
 * Format a time with timezone information
 * @returns Object with formatted time, abbreviation, and offset for tooltip
 */
export function formatTimeWithTimezone(
	time: string,
	timezone: string,
	date?: Date,
	use24h: boolean = false
): { time: string; abbreviation: string; offset: string } {
	return {
		time: formatTime(time, use24h),
		abbreviation: getTimezoneAbbreviation(timezone, date),
		offset: getTimezoneOffset(timezone, date)
	};
}

/**
 * Calculate real duration between two times in different timezones
 * Accounts for timezone differences and returns duration in minutes
 */
export function calculateRealDuration(
	departureTime: string,
	departureTimezone: string,
	arrivalTime: string,
	arrivalTimezone: string,
	departureDate: string,
	arrivalDate: string
): number {
	// Parse times
	const [depHours, depMinutes] = departureTime.split(':').map(Number);
	const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);

	// Create Date objects in UTC first, then adjust for timezone
	const depDate = new Date(`${departureDate}T${departureTime}:00`);
	const arrDate = new Date(`${arrivalDate}T${arrivalTime}:00`);

	// Get timezone offsets in minutes
	function getOffsetMinutes(timezone: string, date: Date): number {
		try {
			// Create a formatter that outputs the date in the target timezone
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});

			// Parse the formatted date parts
			const parts = formatter.formatToParts(date);
			const getPart = (type: string) =>
				parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

			const tzYear = getPart('year');
			const tzMonth = getPart('month') - 1;
			const tzDay = getPart('day');
			const tzHour = getPart('hour');
			const tzMinute = getPart('minute');

			// Create a UTC date representing the timezone's local time
			const tzDate = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute));

			// The offset is the difference between the timezone's local time and UTC
			return (date.getTime() - tzDate.getTime()) / (1000 * 60);
		} catch {
			return 0;
		}
	}

	const depOffsetMin = getOffsetMinutes(departureTimezone, depDate);
	const arrOffsetMin = getOffsetMinutes(arrivalTimezone, arrDate);

	// Convert both times to UTC
	const depUtcMinutes =
		depDate.getTime() / (1000 * 60) + depOffsetMin;
	const arrUtcMinutes =
		arrDate.getTime() / (1000 * 60) + arrOffsetMin;

	return Math.round(arrUtcMinutes - depUtcMinutes);
}

/**
 * Get the timezone offset difference between two timezones
 * Returns the difference in minutes (positive = destination is ahead)
 * 
 * @example
 * // SFO to NYC (3 hours ahead)
 * getTimezoneOffsetDifference('America/Los_Angeles', 'America/New_York') // { hours: 3, minutes: 0, totalMinutes: 180 }
 * 
 * // NYC to India (9.5 hours ahead)
 * getTimezoneOffsetDifference('America/New_York', 'Asia/Kolkata') // { hours: 9, minutes: 30, totalMinutes: 570 }
 */
export function getTimezoneOffsetDifference(
	fromTimezone: string,
	toTimezone: string,
	date?: Date
): { hours: number; minutes: number; totalMinutes: number } {
	const d = date || new Date();

	function getOffsetMinutes(timezone: string): number {
		try {
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				timeZoneName: 'longOffset'
			});
			const parts = formatter.formatToParts(d);
			const tzPart = parts.find((p) => p.type === 'timeZoneName');
			
			if (tzPart?.value) {
				const match = tzPart.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
				if (match) {
					const sign = match[1] === '+' ? 1 : -1;
					const hours = parseInt(match[2], 10);
					const mins = match[3] ? parseInt(match[3], 10) : 0;
					return sign * (hours * 60 + mins);
				}
			}
			return 0;
		} catch {
			return 0;
		}
	}

	const fromOffset = getOffsetMinutes(fromTimezone);
	const toOffset = getOffsetMinutes(toTimezone);
	const totalMinutes = toOffset - fromOffset;

	const absMinutes = Math.abs(totalMinutes);
	const hours = Math.floor(absMinutes / 60) * Math.sign(totalMinutes);
	const minutes = absMinutes % 60;

	return {
		hours: hours === 0 && totalMinutes < 0 ? -0 : hours, // Preserve sign for small offsets
		minutes,
		totalMinutes
	};
}

/**
 * Format timezone offset difference as a string
 * @example
 * formatTimezoneChange('America/Los_Angeles', 'America/New_York') // "+3h"
 * formatTimezoneChange('America/New_York', 'America/Los_Angeles') // "-3h"
 * formatTimezoneChange('America/New_York', 'Asia/Kolkata') // "+9h 30m"
 * formatTimezoneChange('Europe/London', 'Asia/Kathmandu') // "+5h 45m"
 */
export function formatTimezoneChange(
	fromTimezone: string,
	toTimezone: string,
	date?: Date
): string | null {
	if (!fromTimezone || !toTimezone || fromTimezone === toTimezone) {
		return null;
	}

	const diff = getTimezoneOffsetDifference(fromTimezone, toTimezone, date);
	
	if (diff.totalMinutes === 0) {
		return null;
	}

	const sign = diff.totalMinutes > 0 ? '+' : '-';
	const absHours = Math.abs(diff.hours);
	
	if (diff.minutes === 0) {
		return `${sign}${absHours}h`;
	}
	
	return `${sign}${absHours}h ${diff.minutes}m`;
}
