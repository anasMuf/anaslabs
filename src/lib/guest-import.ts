/**
 * Pure helpers for the guest list: parse a pasted sheet, normalise names and
 * phones, and diff the paste against what is already in `guests`.
 *
 * Everything here is side-effect free so the interesting rules (headers, slug
 * collisions, dedupe, archiving) are unit tested without Supabase. The server
 * function in `lib/guests.ts` is a thin layer of I/O around these.
 */

export type GuestSource = "anas" | "mila";
export type GuestDelivery = "digital" | "fisik";

export const GUEST_SOURCES: readonly GuestSource[] = ["anas", "mila"];

export const GUEST_SOURCE_LABELS: Record<GuestSource, string> = {
	anas: "Anas",
	mila: "Mila",
};

export const GUEST_NAME_MAX = 80;
/** Refuse absurd pastes instead of letting one click write thousands of rows. */
export const GUEST_IMPORT_MAX_ROWS = 1200;
/** Rows kept by the preview payload (counts always cover everything). */
export const GUEST_PREVIEW_SAMPLE = 12;

export type GuestParseIssue = "empty" | "no-header" | "too-many";

export interface ParsedGuestRow {
	/** 1-based line number in the pasted text, for error reporting. */
	rowNumber: number;
	name: string;
	nameKey: string;
	groupName: string | null;
	delivery: GuestDelivery;
	sent: boolean;
	phone: string | null;
}

export interface GuestTableParse {
	rows: ParsedGuestRow[];
	/** Non-empty lines that were not usable as guests (blank, header repeats, numeric NO cells). */
	skipped: number;
	/** Lines dropped because the same name already appeared earlier in the paste. */
	duplicates: number;
	issue?: GuestParseIssue;
}

const HEADER_PATTERNS = {
	name: /^(nama|nama tamu|name)$/i,
	group: /(keterangan|grup|golongan|group|kategori)/i,
	delivery: /(fisik|digital)/i,
	sent: /(status|terkirim|pengiriman)/i,
	phone: /(no\.?\s*hp|nomor|telp|telepon|whatsapp|\bwa\b|\bhp\b)/i,
} as const;

type HeaderKey = keyof typeof HEADER_PATTERNS;

const SENT_VALUES = /^(true|1|yes|ya|y|v|✓|✔|sudah|sent|terkirim|check)$/i;

/** Collapses whitespace and trims; keeps the original casing for display. */
function cleanCell(value: string | undefined): string {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Splits one line, honouring quoted CSV cells (`"a,b"` and `""` escapes). */
export function splitSheetRow(line: string, delimiter: string): string[] {
	const cells: string[] = [];
	let current = "";
	let quoted = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];

		if (quoted) {
			if (char === '"' && line[index + 1] === '"') {
				current += '"';
				index += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				current += char;
			}
			continue;
		}

		if (char === '"') {
			quoted = true;
		} else if (char === delimiter) {
			cells.push(current);
			current = "";
		} else {
			current += char;
		}
	}

	cells.push(current);
	return cells;
}

/**
 * Google Sheets puts a tab between cells when you copy a selection, and commas
 * when you download CSV. Pick whichever appears in the first lines.
 */
function detectDelimiter(lines: string[]): string {
	return lines.slice(0, 10).some((line) => line.includes("\t")) ? "\t" : ",";
}

function mapHeader(cells: string[]): Map<HeaderKey, number> {
	const map = new Map<HeaderKey, number>();

	cells.forEach((cell, index) => {
		const label = cleanCell(cell);
		if (!label) return;

		for (const key of Object.keys(HEADER_PATTERNS) as HeaderKey[]) {
			if (map.has(key)) continue;
			if (HEADER_PATTERNS[key].test(label)) {
				map.set(key, index);
				return;
			}
		}
	});

	return map;
}

/** Lowercase, punctuation-free identity used to recognise a guest across imports. */
export function guestNameKey(name: string): string {
	return cleanCell(name)
		.toLowerCase()
		.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
		.replace(/\s+/g, " ");
}

/**
 * `Bpk. Anton Y Tejakusuma` → `bpk-anton-y-tejakusuma`.
 *
 * Diacritics are stripped and every non-alphanumeric run becomes a single dash,
 * so the slug is safe in a URL path segment without encoding.
 */
export function slugifyGuestName(name: string): string {
	const slug = name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/['’`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48)
		.replace(/-+$/g, "");

	return slug || "tamu";
}

/** Returns the first free slug: `cak-abid`, then `cak-abid-2`, `cak-abid-3`, … */
export function nextFreeSlug(base: string, taken: ReadonlySet<string>): string {
	if (!taken.has(base)) return base;

	for (let suffix = 2; suffix < 1000; suffix += 1) {
		const candidate = `${base}-${suffix}`;
		if (!taken.has(candidate)) return candidate;
	}

	return `${base}-${Date.now()}`;
}

/**
 * `08xx`/`8xx` become `62…` because Wablas (and WhatsApp) expect the country
 * code. Anything that does not look like a phone number becomes `null` rather
 * than being stored half-formed.
 */
export function normalizeGuestPhone(
	raw: string | null | undefined,
): string | null {
	const digits = (raw ?? "").replace(/\D/g, "");
	if (!digits) return null;

	let candidate: string;
	if (digits.startsWith("62")) candidate = digits;
	else if (digits.startsWith("0")) candidate = `62${digits.slice(1)}`;
	else if (digits.startsWith("8")) candidate = `62${digits}`;
	else candidate = digits;

	return candidate.length >= 9 && candidate.length <= 15 ? candidate : null;
}

function parseDelivery(raw: string | undefined): GuestDelivery {
	const value = cleanCell(raw).toLowerCase();
	return /fisik|physical|print|cetak/.test(value) ? "fisik" : "digital";
}

function parseSent(raw: string | undefined): boolean {
	const value = cleanCell(raw);
	if (!value) return false;
	return SENT_VALUES.test(value) || /terkirim|sudah/i.test(value);
}

/** Parses a pasted selection. Header names decide the columns, not their order. */
export function parseGuestTable(input: string): GuestTableParse {
	const text = (input ?? "").replace(/\r\n?/g, "\n");
	if (!text.trim())
		return { rows: [], skipped: 0, duplicates: 0, issue: "empty" };

	const lines = text.split("\n");
	const delimiter = detectDelimiter(lines);
	const cellsByLine = lines.map((line) => splitSheetRow(line, delimiter));

	const headerIndex = cellsByLine.findIndex((cells) =>
		cells.some((cell) => HEADER_PATTERNS.name.test(cleanCell(cell))),
	);
	if (headerIndex === -1) {
		return { rows: [], skipped: 0, duplicates: 0, issue: "no-header" };
	}

	const columns = mapHeader(cellsByLine[headerIndex]);
	const nameColumn = columns.get("name");
	if (nameColumn === undefined) {
		return { rows: [], skipped: 0, duplicates: 0, issue: "no-header" };
	}

	const rows: ParsedGuestRow[] = [];
	const seen = new Set<string>();
	let skipped = 0;
	let duplicates = 0;

	for (let index = headerIndex + 1; index < cellsByLine.length; index += 1) {
		if (rows.length >= GUEST_IMPORT_MAX_ROWS) {
			return { rows, skipped, duplicates, issue: "too-many" };
		}

		const cells = cellsByLine[index];
		if (cells.every((cell) => !cleanCell(cell))) {
			skipped += 1;
			continue;
		}

		// A header repeated mid-paste (multiple blocks) must not become a guest.
		if (HEADER_PATTERNS.name.test(cleanCell(cells[nameColumn]))) {
			skipped += 1;
			continue;
		}

		const name = cleanCell(cells[nameColumn]).slice(0, GUEST_NAME_MAX);
		const nameKey = guestNameKey(name);

		// `NO` cells (`1`, `2`, …) mean the paste started at the wrong column.
		if (!name || /^\d+$/.test(name)) {
			skipped += 1;
			continue;
		}

		if (seen.has(nameKey)) {
			duplicates += 1;
			continue;
		}
		seen.add(nameKey);

		const groupIndex = columns.get("group");
		const deliveryIndex = columns.get("delivery");
		const sentIndex = columns.get("sent");
		const phoneIndex = columns.get("phone");

		rows.push({
			rowNumber: index + 1,
			name,
			nameKey,
			groupName:
				groupIndex === undefined
					? null
					: cleanCell(cells[groupIndex]).slice(0, 60) || null,
			delivery: parseDelivery(
				deliveryIndex === undefined ? "" : cells[deliveryIndex],
			),
			sent: parseSent(sentIndex === undefined ? "" : cells[sentIndex]),
			phone: normalizeGuestPhone(
				phoneIndex === undefined ? "" : cells[phoneIndex],
			),
		});
	}

	return { rows, skipped, duplicates };
}

export interface ExistingGuest {
	id: string;
	slug: string;
	name: string;
	nameKey: string;
	source: GuestSource;
	groupName: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	sentAt: string | null;
	archived: boolean;
}

export interface GuestCreate {
	slug: string;
	name: string;
	nameKey: string;
	source: GuestSource;
	groupName: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	sentAt: string | null;
}

export interface GuestChange {
	id: string;
	name: string;
	nameKey: string;
	groupName: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	sentAt: string | null;
	/** Human labels of what differs: nama, grup, tipe, nomor, status. */
	changes: string[];
}

export interface GuestImportPlan {
	create: GuestCreate[];
	update: GuestChange[];
	restore: GuestChange[];
	archive: Array<{ id: string; name: string }>;
	unchanged: number;
}

function diffGuest(existing: ExistingGuest, row: ParsedGuestRow): string[] {
	const changes: string[] = [];
	if (existing.name !== row.name) changes.push("nama");
	if ((existing.groupName ?? "") !== (row.groupName ?? ""))
		changes.push("grup");
	if (existing.delivery !== row.delivery) changes.push("tipe");
	if ((existing.phone ?? "") !== (row.phone ?? "")) changes.push("nomor");
	if (Boolean(existing.sentAt) !== row.sent) changes.push("status");
	return changes;
}

function sentAtFor(row: ParsedGuestRow, previous: string | null, now: string) {
	if (!row.sent) return null;
	return previous ?? now;
}

/**
 * Works out what an import would change. Existing guests are matched by
 * `source + nameKey` and keep their slug forever; only new names get a slug,
 * taken from the set of slugs already in use (including ones added earlier in
 * the same import, so two sources can never collide).
 */
export function planGuestImport(
	rows: ParsedGuestRow[],
	existing: ExistingGuest[],
	source: GuestSource,
	now: string = new Date().toISOString(),
): GuestImportPlan {
	const taken = new Set(existing.map((guest) => guest.slug));
	const byNameKey = new Map(
		existing
			.filter((guest) => guest.source === source)
			.map((guest) => [guest.nameKey, guest]),
	);

	const create: GuestCreate[] = [];
	const update: GuestChange[] = [];
	const restore: GuestChange[] = [];
	const present = new Set<string>();
	let unchanged = 0;

	for (const row of rows) {
		present.add(row.nameKey);
		const match = byNameKey.get(row.nameKey);

		if (!match) {
			const slug = nextFreeSlug(slugifyGuestName(row.name), taken);
			taken.add(slug);
			create.push({
				slug,
				name: row.name,
				nameKey: row.nameKey,
				source,
				groupName: row.groupName,
				delivery: row.delivery,
				phone: row.phone,
				sentAt: sentAtFor(row, null, now),
			});
			continue;
		}

		const changes = diffGuest(match, row);
		const entry: GuestChange = {
			id: match.id,
			name: row.name,
			nameKey: row.nameKey,
			groupName: row.groupName,
			delivery: row.delivery,
			phone: row.phone,
			sentAt: sentAtFor(row, match.sentAt, now),
			changes,
		};

		if (match.archived) {
			restore.push({ ...entry, changes: [...changes, "pulih"] });
		} else if (changes.length) {
			update.push(entry);
		} else {
			unchanged += 1;
		}
	}

	const archive = existing
		.filter(
			(guest) =>
				guest.source === source &&
				!guest.archived &&
				!present.has(guest.nameKey),
		)
		.map((guest) => ({ id: guest.id, name: guest.name }));

	return { create, update, restore, archive, unchanged };
}
