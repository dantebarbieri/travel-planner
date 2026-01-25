export function formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
	const date = new Date(isoDate);
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
	const date = new Date(isoDate);
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

export function toISODateString(date: Date): string {
	return date.toISOString().split('T')[0];
}

export function parseISODate(isoDate: string): Date {
	return new Date(isoDate + 'T00:00:00');
}

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
