/**
 * Invitation view helpers.
 *
 * Dates are stored as date-only ISO strings (`YYYY-MM-DD`) and formatted in
 * UTC so a date never shifts by a day depending on the visitor's timezone.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const eventDateFormatter = new Intl.DateTimeFormat("id-ID", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "numeric",
	timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
	month: "long",
	timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("id-ID", {
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

function parseDate(iso: string): Date | null {
	const match = DATE_ONLY.exec(iso.trim());
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	// Reject impossible dates such as 2026-02-31 (JS rolls them over).
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
}

/** "Sabtu, 19 Desember 2026" — empty string for an invalid date. */
export function formatEventDate(iso: string): string {
	const date = parseDate(iso);
	if (!date) return "";
	// The template (Figma 384:429) writes Sunday as "Ahad", while `id-ID`
	// resolves it to "Minggu"; keep the design's wording.
	return eventDateFormatter.format(date).replace(/^Minggu\b/, "Ahad");
}

/**
 * "19 - 20 Desember 2026" for a range inside one month, falling back to the
 * full weekday format for a single day and to both months across a boundary.
 */
export function formatCoverDateRange(startIso: string, endIso: string): string {
	const start = parseDate(startIso);
	if (!start) return "";

	const end = parseDate(endIso);
	if (!end || start.getTime() === end.getTime()) {
		return formatEventDate(startIso);
	}

	const sameMonth =
		start.getUTCMonth() === end.getUTCMonth() &&
		start.getUTCFullYear() === end.getUTCFullYear();

	if (sameMonth) {
		return `${dayFormatter.format(start)} - ${dayFormatter.format(
			end,
		)} ${monthYearFormatter.format(end)}`;
	}

	return `${dayFormatter.format(start)} ${monthFormatter.format(
		start,
	)} - ${dayFormatter.format(end)} ${monthYearFormatter.format(end)}`;
}
