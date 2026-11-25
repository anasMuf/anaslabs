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
/** Page size for the dashboard guest table (infinite scroll). */
export const GUEST_PAGE_SIZE = 40;

export type GuestParseIssue = "empty" | "no-header" | "too-many";

export interface ParsedGuestRow {
	/** 1-based line number in the pasted text, for error reporting. */
	rowNumber: number;
	name: string;
	nameKey: string;
	groupName: string | null;
	address: string | null;
	/** Kolom DIUNDANG, mis. "Sekalian"; "-" berarti kosong. */
	invited: string | null;
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
	address: /^(alamat|address|domisili|kota)/i,
	invited: /^(diundang|undangan|invited)$/i,
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

/** Groups are matched case-insensitively; an empty cell is its own group. */
function guestGroupKey(value: string | null): string {
	return cleanCell(value ?? "").toLowerCase();
}

/** Sheet cells use "-" for empty; store it as NULL so the UI can say "tanpa …". */
function cleanNote(value: string | undefined): string | null {
	const note = cleanCell(value);
	return !note || note === "-" || note === "—" ? null : note;
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
 * Strips everything except digits so a pasted number like `+62 812-3456-7890`
 * turns into `6281234567890` while the user is still typing. Keeps the raw
 * digit string (leading `0` included); use {@link normalizeGuestPhone} when the
 * value is about to be stored or sent.
 */
export function digitsOnly(raw: string | null | undefined): string {
	return (raw ?? "").replace(/\D/g, "");
}

/**
 * Sanitiser for the phone input: keeps a single leading `+` as the international
 * marker and drops every other non-digit character. `+44 7911-123456` becomes
 * `+447911123456` while `(0812) 3456 7890` becomes `081234567890`.
 *
 * The `+` is what tells {@link normalizeGuestPhone} that the country code is
 * already included, so it is not rewritten to the Indonesian `62` prefix.
 */
export function phoneInput(raw: string | null | undefined): string {
	const value = (raw ?? "").trim();
	const digits = digitsOnly(value);
	return value.startsWith("+") && digits ? `+${digits}` : digits;
}

/**
 * Resolves a phone value to the bare digit form that Wablas/WhatsApp expect.
 *
 * - A leading `+` means the value already carries a country code, so the digits
 *   are kept as-is (e.g. `+44 7911 123456` → `447911123456`).
 * - Without a `+`, local Indonesian input is assumed: `08xx`/`8xx` become `62…`
 *   and anything already starting with `62` is kept.
 * - Other digit strings (e.g. `60123456789`) are treated as already including
 *   their country code and kept.
 *
 * We deliberately do not map the code to a country name: the digits themselves
 * are enough, and a bare local number from another country cannot be told apart
 * from an Indonesian one. Anything implausible becomes `null` rather than being
 * stored half-formed.
 */
export function normalizeGuestPhone(
	raw: string | null | undefined,
): string | null {
	const value = (raw ?? "").trim();
	const international = value.startsWith("+");
	const digits = digitsOnly(value);
	if (!digits) return null;

	let candidate: string;
	if (international) candidate = digits;
	else if (digits.startsWith("62")) candidate = digits;
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
	const groupIndex = columns.get("group");
	const addressIndex = columns.get("address");
	const invitedIndex = columns.get("invited");
	const deliveryIndex = columns.get("delivery");
	const sentIndex = columns.get("sent");
	const phoneIndex = columns.get("phone");

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

		const groupName =
			groupIndex === undefined
				? null
				: cleanCell(cells[groupIndex]).slice(0, 60) || null;

		// Nama boleh kembar dalam satu sheet selama grupnya berbeda (mis. dua
		// "Wildan" dari Afindo dan Unhasy), jadi identitas baris = nama + grup.
		const identity = `${nameKey}\u0000${guestGroupKey(groupName)}`;
		if (seen.has(identity)) {
			duplicates += 1;
			continue;
		}
		seen.add(identity);

		rows.push({
			rowNumber: index + 1,
			name,
			nameKey,
			groupName,
			address:
				addressIndex === undefined
					? null
					: (cleanNote(cells[addressIndex])?.slice(0, 120) ?? null),
			invited:
				invitedIndex === undefined
					? null
					: (cleanNote(cells[invitedIndex])?.slice(0, 60) ?? null),
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
	address: string | null;
	invited: string | null;
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
	address: string | null;
	invited: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	sentAt: string | null;
}

export interface GuestChange {
	id: string;
	/**
	 * Carried along so the update can be sent as an upsert: Postgres builds the
	 * INSERT tuple (and checks NOT NULL) before resolving the `id` conflict, so
	 * `slug`/`source_sheet` must be present even though they never change.
	 */
	slug: string;
	source: GuestSource;
	name: string;
	nameKey: string;
	groupName: string | null;
	address: string | null;
	invited: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	sentAt: string | null;
	/** Human labels of what differs: nama, grup, alamat, undangan, tipe, nomor, status. */
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
	if ((existing.address ?? "") !== (row.address ?? "")) changes.push("alamat");
	if ((existing.invited ?? "") !== (row.invited ?? ""))
		changes.push("undangan");
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
 * `source + nameKey + group`, so two guests with the same name in different
 * groups (the two "Wildan" rows) both survive. Each existing row can only be
 * matched once per import. Slugs never change; only new names get one, taken
 * from the set of slugs already in use (including ones added earlier in the
 * same import, so two sources can never collide).
 */
export function planGuestImport(
	rows: ParsedGuestRow[],
	existing: ExistingGuest[],
	source: GuestSource,
	now: string = new Date().toISOString(),
): GuestImportPlan {
	const taken = new Set(existing.map((guest) => guest.slug));
	const byNameKey = new Map<string, ExistingGuest[]>();
	for (const guest of existing) {
		if (guest.source !== source) continue;
		const list = byNameKey.get(guest.nameKey);
		if (list) list.push(guest);
		else byNameKey.set(guest.nameKey, [guest]);
	}

	const used = new Set<string>();
	const matches = new Map<number, ExistingGuest>();
	const freeCandidates = (row: ParsedGuestRow) =>
		(byNameKey.get(row.nameKey) ?? []).filter((guest) => !used.has(guest.id));

	// First pass: pair rows whose group matches an existing guest exactly, so a
	// same-named newcomer cannot steal the row that already belongs to someone
	// else in another group.
	rows.forEach((row, index) => {
		const groupKey = guestGroupKey(row.groupName);
		const match = freeCandidates(row).find(
			(guest) => guestGroupKey(guest.groupName) === groupKey,
		);
		if (!match) return;
		used.add(match.id);
		matches.set(index, match);
	});

	// Second pass: everything still unmatched (e.g. a renamed group) takes an
	// active same-named row first, then whatever is left.
	rows.forEach((row, index) => {
		if (matches.has(index)) return;
		const candidates = freeCandidates(row);
		if (!candidates.length) return;
		const match = candidates.find((guest) => !guest.archived) ?? candidates[0];
		used.add(match.id);
		matches.set(index, match);
	});

	const create: GuestCreate[] = [];
	const update: GuestChange[] = [];
	const restore: GuestChange[] = [];
	let unchanged = 0;

	rows.forEach((row, index) => {
		const match = matches.get(index);

		if (!match) {
			const slug = nextFreeSlug(slugifyGuestName(row.name), taken);
			taken.add(slug);
			create.push({
				slug,
				name: row.name,
				nameKey: row.nameKey,
				source,
				groupName: row.groupName,
				address: row.address,
				invited: row.invited,
				delivery: row.delivery,
				phone: row.phone,
				sentAt: sentAtFor(row, null, now),
			});
			return;
		}

		const changes = diffGuest(match, row);
		const entry: GuestChange = {
			id: match.id,
			slug: match.slug,
			source: match.source,
			name: row.name,
			nameKey: row.nameKey,
			groupName: row.groupName,
			address: row.address,
			invited: row.invited,
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
	});

	const archive = existing
		.filter(
			(guest) =>
				guest.source === source && !guest.archived && !used.has(guest.id),
		)
		.map((guest) => ({ id: guest.id, name: guest.name }));

	return { create, update, restore, archive, unchanged };
}
