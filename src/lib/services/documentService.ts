import type { Trip, ItineraryDay, DailyItem, Stay, Activity, FoodVenue, TransportLeg } from '$lib/types/travel';
import { formatDate, formatTime, formatDuration } from '$lib/utils/dates';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

// ============ Helper Functions ============

function getItemDetails(
	item: DailyItem,
	stays: Stay[],
	activities: Activity[],
	foodVenues: FoodVenue[],
	transportLegs: TransportLeg[]
): { name: string; details: string[]; time?: string } {
	switch (item.kind) {
		case 'stay': {
			const stay = stays.find((s) => s.id === item.stayId);
			if (!stay) return { name: 'Unknown Stay', details: [] };
			const details = [stay.location.address.formatted];
			if (item.isCheckIn) details.push('Check-in');
			if (item.isCheckOut) details.push('Check-out');
			return { name: stay.name, details };
		}
		case 'activity': {
			const activity = activities.find((a) => a.id === item.activityId);
			if (!activity) return { name: 'Unknown Activity', details: [] };
			const details = [activity.location.address.formatted];
			if (activity.price !== undefined && activity.currency) {
				details.push(`Admission: ${activity.currency} ${activity.price}`);
			}
			if (activity.openingHours) {
				details.push('See opening hours');
			}
			return { name: activity.name, details };
		}
		case 'food': {
			const venue = foodVenues.find((f) => f.id === item.foodVenueId);
			if (!venue) return { name: 'Unknown Venue', details: [] };
			const details = [venue.location.address.formatted];
			if (venue.cuisineTypes?.length) details.push(`Cuisine: ${venue.cuisineTypes.join(', ')}`);
			if (venue.priceLevel) details.push(`Price: ${'$'.repeat(venue.priceLevel)}`);
			return { name: venue.name, details };
		}
		case 'transport': {
			const leg = transportLegs.find((t) => t.id === item.transportLegId);
			if (!leg) return { name: 'Unknown Transport', details: [] };
			const details = [`${leg.origin.name} → ${leg.destination.name}`];
			if (leg.duration) details.push(`Duration: ${formatDuration(leg.duration)}`);
			if (leg.carrier) details.push(`Carrier: ${leg.carrier}`);
			return { name: `${leg.mode.charAt(0).toUpperCase() + leg.mode.slice(1)}`, details };
		}
	}
}

// ============ HTML Generation for PDF ============

function generateTripHTML(trip: Trip, use24h: boolean = false): string {
	const allStays = trip.cities.flatMap((c) => c.stays);

	let html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>${trip.name}</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			line-height: 1.5;
			color: #1a1a1a;
			padding: 40px;
			max-width: 800px;
			margin: 0 auto;
		}
		h1 { font-size: 28px; margin-bottom: 8px; }
		h2 { font-size: 20px; margin: 24px 0 12px; color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
		h3 { font-size: 16px; margin: 16px 0 8px; color: #555; }
		.trip-meta { color: #666; margin-bottom: 24px; font-size: 14px; }
		.cities { margin-bottom: 8px; }
		.day { margin-bottom: 24px; page-break-inside: avoid; }
		.day-header {
			background: #f5f5f5;
			padding: 12px 16px;
			border-radius: 8px;
			margin-bottom: 12px;
		}
		.day-date { font-size: 14px; color: #666; }
		.day-title { font-size: 18px; font-weight: 600; }
		.item {
			padding: 12px 16px;
			border-left: 4px solid #ddd;
			margin: 8px 0;
			background: #fafafa;
		}
		.item-stay { border-left-color: #9b59b6; }
		.item-activity { border-left-color: #27ae60; }
		.item-food { border-left-color: #e67e22; }
		.item-transport { border-left-color: #3498db; }
		.item-name { font-weight: 600; margin-bottom: 4px; }
		.item-time { font-size: 12px; color: #888; margin-bottom: 4px; }
		.item-detail { font-size: 13px; color: #666; }
		.no-items { color: #999; font-style: italic; padding: 12px 16px; }
		@media print {
			body { padding: 20px; }
			.day { page-break-inside: avoid; }
		}
	</style>
</head>
<body>
	<h1>${escapeHtml(trip.name)}</h1>
	<div class="trip-meta">
		<div>${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</div>
		<div class="cities">${trip.cities.map((c) => c.name).join(' → ')}</div>
	</div>
`;

	for (const day of trip.itinerary) {
		const city = trip.cities.find((c) => day.cityIds.includes(c.id));
		html += `
	<div class="day">
		<div class="day-header">
			<div class="day-date">Day ${day.dayNumber} - ${formatDate(day.date)}</div>
			<div class="day-title">${city ? escapeHtml(city.name) : 'Travel Day'}${day.title ? ` - ${escapeHtml(day.title)}` : ''}</div>
		</div>
`;

		if (day.items.length === 0) {
			html += `		<div class="no-items">No items planned</div>\n`;
		} else {
			for (const item of day.items) {
				const { name, details, time } = getItemDetails(
					item,
					allStays,
					trip.activities,
					trip.foodVenues,
					trip.transportLegs
				);
				html += `
		<div class="item item-${item.kind}">
			${time ? `<div class="item-time">${formatTime(time, use24h)}</div>` : ''}
			<div class="item-name">${escapeHtml(name)}</div>
			${details.map((d) => `<div class="item-detail">${escapeHtml(d)}</div>`).join('\n			')}
		</div>
`;
			}
		}

		html += `	</div>\n`;
	}

	html += `
</body>
</html>`;

	return html;
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// ============ PDF Export ============

export async function exportToPDF(trip: Trip, use24h: boolean = false): Promise<void> {
	// Dynamic import html2pdf to avoid SSR issues
	const html2pdf = (await import('html2pdf.js')).default;

	const html = generateTripHTML(trip, use24h);

	// Create a temporary container
	const container = document.createElement('div');
	container.innerHTML = html;
	container.style.position = 'absolute';
	container.style.left = '-9999px';
	document.body.appendChild(container);

	const options = {
		margin: 10,
		filename: `${trip.name.replace(/\s+/g, '-').toLowerCase()}-itinerary.pdf`,
		image: { type: 'jpeg' as const, quality: 0.98 },
		html2canvas: { scale: 2, useCORS: true },
		jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
	};

	try {
		await html2pdf().set(options).from(container).save();
	} finally {
		document.body.removeChild(container);
	}
}

// ============ DOCX Export ============

export async function exportToDOCX(trip: Trip, use24h: boolean = false): Promise<void> {
	const allStays = trip.cities.flatMap((c) => c.stays);

	const children: (Paragraph | Table)[] = [];

	// Title
	children.push(
		new Paragraph({
			text: trip.name,
			heading: HeadingLevel.TITLE,
			spacing: { after: 200 }
		})
	);

	// Trip dates
	children.push(
		new Paragraph({
			children: [
				new TextRun({
					text: `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
					color: '666666'
				})
			],
			spacing: { after: 100 }
		})
	);

	// Cities
	children.push(
		new Paragraph({
			children: [
				new TextRun({
					text: trip.cities.map((c) => c.name).join(' → '),
					color: '666666'
				})
			],
			spacing: { after: 400 }
		})
	);

	// Days
	for (const day of trip.itinerary) {
		const city = trip.cities.find((c) => day.cityIds.includes(c.id));

		// Day header
		children.push(
			new Paragraph({
				text: `Day ${day.dayNumber} - ${formatDate(day.date)}`,
				heading: HeadingLevel.HEADING_2,
				spacing: { before: 400, after: 100 }
			})
		);

		children.push(
			new Paragraph({
				children: [
					new TextRun({
						text: `${city ? city.name : 'Travel Day'}${day.title ? ` - ${day.title}` : ''}`,
						bold: true,
						size: 28
					})
				],
				spacing: { after: 200 }
			})
		);

		if (day.items.length === 0) {
			children.push(
				new Paragraph({
					children: [
						new TextRun({
							text: 'No items planned',
							italics: true,
							color: '999999'
						})
					],
					spacing: { after: 200 }
				})
			);
		} else {
			// Create table for items
			const tableRows: TableRow[] = [];

			for (const item of day.items) {
				const { name, details, time } = getItemDetails(
					item,
					allStays,
					trip.activities,
					trip.foodVenues,
					trip.transportLegs
				);

				const kindColors: Record<string, string> = {
					stay: '9b59b6',
					activity: '27ae60',
					food: 'e67e22',
					transport: '3498db'
				};

				tableRows.push(
					new TableRow({
						children: [
							new TableCell({
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: time ? formatTime(time, use24h) : '',
												size: 20,
												color: '888888'
											})
										]
									})
								],
								width: { size: 15, type: WidthType.PERCENTAGE },
								borders: {
									left: {
										style: BorderStyle.SINGLE,
										size: 24,
										color: kindColors[item.kind] || 'dddddd'
									}
								}
							}),
							new TableCell({
								children: [
									new Paragraph({
										children: [
											new TextRun({
												text: name,
												bold: true
											})
										]
									}),
									...details.map(
										(d) =>
											new Paragraph({
												children: [
													new TextRun({
														text: d,
														size: 20,
														color: '666666'
													})
												]
											})
									)
								],
								width: { size: 85, type: WidthType.PERCENTAGE }
							})
						]
					})
				);
			}

			children.push(
				new Table({
					rows: tableRows,
					width: { size: 100, type: WidthType.PERCENTAGE }
				})
			);
		}
	}

	const doc = new Document({
		sections: [
			{
				properties: {},
				children
			}
		]
	});

	const blob = await Packer.toBlob(doc);
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${trip.name.replace(/\s+/g, '-').toLowerCase()}-itinerary.docx`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// ============ Print-friendly HTML ============

export function openPrintView(trip: Trip, use24h: boolean = false): void {
	const html = generateTripHTML(trip, use24h);
	const printWindow = window.open('', '_blank');
	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
		};
	}
}

// ============ Export Service ============

export const documentService = {
	exportToPDF,
	exportToDOCX,
	openPrintView,
	generateTripHTML
};
