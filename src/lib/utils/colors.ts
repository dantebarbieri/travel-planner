import type { DailyItemKind, KindColors, ColorScheme, StayId } from '$lib/types/travel';

export const defaultKindColors: KindColors = {
	stay: 'oklch(0.7 0.15 280)',
	activity: 'oklch(0.65 0.2 145)',
	food: 'oklch(0.7 0.18 50)',
	transport: 'oklch(0.6 0.15 230)',
	flight: 'oklch(0.55 0.2 260)'
};

export const stayColorPalette = [
	'oklch(0.7 0.15 280)', // Purple
	'oklch(0.7 0.18 180)', // Teal
	'oklch(0.7 0.15 340)', // Pink
	'oklch(0.7 0.18 100)', // Lime
	'oklch(0.65 0.2 30)', // Orange-red
	'oklch(0.7 0.15 220)', // Sky blue
	'oklch(0.65 0.18 310)', // Magenta
	'oklch(0.7 0.15 70)' // Gold
];

export function getDefaultColorScheme(): ColorScheme {
	return {
		mode: 'by-kind',
		kindColors: { ...defaultKindColors }
	};
}

export function getColorForKind(kind: DailyItemKind, colorScheme: ColorScheme): string {
	if (kind === 'transport') {
		return colorScheme.kindColors.transport;
	}
	return colorScheme.kindColors[kind] || colorScheme.kindColors.activity;
}

export function getColorForStay(stayId: StayId, colorScheme: ColorScheme): string {
	if (colorScheme.mode === 'by-stay' && colorScheme.stayColors?.[stayId]) {
		return colorScheme.stayColors[stayId];
	}
	return colorScheme.kindColors.stay;
}

export function assignStayColors(stayIds: StayId[]): Record<StayId, string> {
	const colors: Record<StayId, string> = {};
	stayIds.forEach((id, index) => {
		colors[id] = stayColorPalette[index % stayColorPalette.length];
	});
	return colors;
}

export function getItemColor(
	kind: DailyItemKind,
	stayId: StayId | undefined,
	colorScheme: ColorScheme
): string {
	if (colorScheme.mode === 'by-stay' && stayId && colorScheme.stayColors?.[stayId]) {
		return colorScheme.stayColors[stayId];
	}
	return getColorForKind(kind, colorScheme);
}

export function lightenColor(oklchColor: string, amount: number = 0.1): string {
	const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
	if (!match) return oklchColor;
	const [, l, c, h] = match;
	const newL = Math.min(1, parseFloat(l) + amount);
	return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

export function darkenColor(oklchColor: string, amount: number = 0.1): string {
	const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
	if (!match) return oklchColor;
	const [, l, c, h] = match;
	const newL = Math.max(0, parseFloat(l) - amount);
	return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

export function getContrastColor(oklchColor: string): string {
	const match = oklchColor.match(/oklch\(([\d.]+)/);
	if (!match) return 'black';
	const lightness = parseFloat(match[1]);
	return lightness > 0.6 ? 'oklch(0.2 0 0)' : 'oklch(0.98 0 0)';
}
