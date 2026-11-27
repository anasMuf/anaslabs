import {
	type GuestSource,
	guestNameKey,
	normalizeGuestPhone,
	splitSheetRow,
} from "./guest-import";

/**
 * Contact-file import (CSV / Google Contacts `.xlsx`).
 *
 * The flow only ever *fills or overwrites a phone number*: it never creates,
 * renames, or archives a guest. Parsing and matching happen in the browser, so
 * a personal contact file never leaves the device; only the confirmed
 * guest-id/phone pairs are sent to the server.
 */

/** Refuse absurd files instead of rendering thousands of matching rows. */
export const CONTACT_ROW_MAX = 5000;

export interface ParsedContact {
	/** 1-based line number in the source file, for error reporting. */
	rowNumber: number;
	name: string;
	/** Normalised `62…`, unique, at least one. */
	phones: string[];
}

export interface ContactParseResult {
	contacts: ParsedContact[];
	/** Rows dropped because they had no usable name or phone. */
	skipped: number;
	/** True when the file had more rows than {@link CONTACT_ROW_MAX}. */
	truncated: boolean;
}

export type ContactMatrix = ReadonlyArray<ReadonlyArray<unknown>>;

const FULL_NAME_HEADER = /^(full ?name|name|nama|nama lengkap|display name)$/;
const FIRST_NAME_HEADER = /^(first name|given name|nama depan)$/;
const MIDDLE_NAME_HEADER = /^(middle name|nama tengah)$/;
const LAST_NAME_HEADER = /^(last name|surname|family name|nama belakang)$/;
const FILE_AS_HEADER = /^(file as|fileas)$/;
const NICKNAME_HEADER = /^(nickname|nama panggilan)$/;
const PHONE_HEADER =
	/(phone|telepon|telp|nomor|no\.?\s*hp|\bhp\b|handphone|whatsapp|\bwa\b|mobile|seluler|ponsel)/i;
const NOT_PHONE_HEADER = /label|type|jenis/i;

/** `:::` is how some contact exports pack a second number into one cell. */
const PHONE_SPLIT = /\s*:::\s*|\r?\n|\s*[;]\s*/;

function headerText(value: unknown): string {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function cellText(value: unknown): string {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
}

interface ContactHeaderMap {
	full: number;
	first: number;
	middle: number;
	last: number;
	fileAs: number;
	nickname: number;
	phones: number[];
}

function findColumn(headers: string[], pattern: RegExp): number {
	return headers.findIndex((header) => pattern.test(header));
}

function mapContactHeader(headerRow: ReadonlyArray<unknown>): ContactHeaderMap {
	const headers = headerRow.map(headerText);

	const map: ContactHeaderMap = {
		full: findColumn(headers, FULL_NAME_HEADER),
		first: findColumn(headers, FIRST_NAME_HEADER),
		middle: findColumn(headers, MIDDLE_NAME_HEADER),
		last: findColumn(headers, LAST_NAME_HEADER),
		fileAs: findColumn(headers, FILE_AS_HEADER),
		nickname: findColumn(headers, NICKNAME_HEADER),
		phones: headers.flatMap((header, index) =>
			header && PHONE_HEADER.test(header) && !NOT_PHONE_HEADER.test(header)
				? [index]
				: [],
		),
	};

	// Headerless or unusual file: fall back to the first non-phone column as the
	// name, so a simple "Budi, 0812" sheet still works.
	const hasNameColumn = [
		map.full,
		map.first,
		map.middle,
		map.last,
		map.fileAs,
		map.nickname,
	].some((index) => index >= 0);
	if (!hasNameColumn && headers.length > 0) {
		const candidate = headers.findIndex(
			(_, index) => !map.phones.includes(index),
		);
		map.full = candidate >= 0 ? candidate : 0;
	}

	return map;
}

function resolveName(
	row: ReadonlyArray<unknown>,
	map: ContactHeaderMap,
): string {
	if (map.full >= 0) {
		const value = cellText(row[map.full]);
		if (value) return value;
	}

	const parts = [map.first, map.middle, map.last]
		.map((index) => (index >= 0 ? cellText(row[index]) : ""))
		.filter(Boolean);
	if (parts.length) return parts.join(" ");

	for (const index of [map.fileAs, map.nickname]) {
		if (index < 0) continue;
		const value = cellText(row[index]);
		if (value) return value;
	}

	return "";
}

function phoneCandidates(value: unknown): string[] {
	const text = cellText(value);
	if (!text) return [];
	return text
		.split(PHONE_SPLIT)
		.map((part) => part.trim())
		.filter(Boolean);
}

function fallbackPhoneCells(
	row: ReadonlyArray<unknown>,
	map: ContactHeaderMap,
): string[] {
	const nameColumns = new Set(
		[
			map.full,
			map.first,
			map.middle,
			map.last,
			map.fileAs,
			map.nickname,
		].filter((index) => index >= 0),
	);
	return row.flatMap((value, index) =>
		nameColumns.has(index) ? [] : phoneCandidates(value),
	);
}

function uniqueNumbers(values: string[]): string[] {
	const seen = new Set<string>();
	for (const value of values) {
		const phone = normalizeGuestPhone(value);
		if (phone) seen.add(phone);
	}
	return [...seen];
}

/** Parses a header + data matrix from a CSV or an `.xlsx` sheet. */
export function parseContactMatrix(matrix: ContactMatrix): ContactParseResult {
	const rows = matrix.filter((row) =>
		row.some((value) => cellText(value).length > 0),
	);
	if (!rows.length) return { contacts: [], skipped: 0, truncated: false };

	const map = mapContactHeader(rows[0]);
	const contacts: ParsedContact[] = [];
	let skipped = 0;
	let truncated = false;

	for (let index = 1; index < rows.length; index += 1) {
		if (contacts.length >= CONTACT_ROW_MAX) {
			truncated = true;
			break;
		}

		const row = rows[index];
		const name = resolveName(row, map).replace(/\s+/g, " ").trim();
		if (!guestNameKey(name)) {
			skipped += 1;
			continue;
		}

		const rawPhones = map.phones.length
			? map.phones.flatMap((column) => phoneCandidates(row[column]))
			: fallbackPhoneCells(row, map);
		const phones = uniqueNumbers(rawPhones);
		if (!phones.length) {
			skipped += 1;
			continue;
		}

		contacts.push({ rowNumber: index + 1, name, phones });
	}

	return { contacts, skipped, truncated };
}

/** Quotes/commas follow the same rules as the guest sheet paste. */
export function parseCsvMatrix(text: string): string[][] {
	const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
	const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
	if (!lines.length) return [];

	const sample = lines.slice(0, 5);
	const delimiter = ["\t", ",", ";"]
		.map((candidate) => ({
			candidate,
			count: sample.reduce(
				(total, line) => total + (line.split(candidate).length - 1),
				0,
			),
		}))
		.sort((a, b) => b.count - a.count)[0];
	const separator = delimiter.count > 0 ? delimiter.candidate : ",";

	return lines.map((line) => splitSheetRow(line, separator));
}

export interface ContactGuest {
	id: string;
	name: string;
	slug: string;
	source: GuestSource;
	groupName: string | null;
	phone: string | null;
}

export interface MatchSuggestion {
	guestId: string;
	score: number;
	/** Two or more guests share the same top score (e.g. twins of a name). */
	ambiguous: boolean;
}

function nameTokens(value: string): string[] {
	return guestNameKey(value).split(" ").filter(Boolean);
}

/**
 * Candidate guests for a contact name.
 *
 * Exact normalised names score 100. Otherwise token overlap gives 50–95, and a
 * plain substring match gives 45. Ambiguous top scores (duplicate guest names)
 * are flagged so the UI never silently picks one.
 */
export function suggestGuestMatches(
	name: string,
	guests: ReadonlyArray<ContactGuest>,
	limit = 3,
): MatchSuggestion[] {
	const key = guestNameKey(name);
	if (!key) return [];
	const contactTokens = nameTokens(name);

	const scored = guests
		.map((guest) => {
			const guestKey = guestNameKey(guest.name);
			if (guestKey === key) return { guestId: guest.id, score: 100 };

			const guestTokens = nameTokens(guest.name);
			const guestSet = new Set(guestTokens);
			const overlap = contactTokens.filter((token) =>
				guestSet.has(token),
			).length;
			if (overlap > 0) {
				const ratio =
					overlap / Math.max(contactTokens.length, guestTokens.length, 1);
				return { guestId: guest.id, score: Math.round(50 + ratio * 45) };
			}

			if (
				key.length >= 3 &&
				(guestKey.includes(key) || key.includes(guestKey))
			) {
				return { guestId: guest.id, score: 45 };
			}

			return { guestId: guest.id, score: 0 };
		})
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score);

	if (!scored.length) return [];

	const topScore = scored[0].score;
	const tieCount = scored.filter((entry) => entry.score === topScore).length;

	return scored.slice(0, limit).map((entry) => ({
		...entry,
		ambiguous: tieCount > 1 && entry.score === topScore,
	}));
}

/** Auto-select the best suggestion unless it is a tie between two guests. */
export function autoGuestId(suggestions: MatchSuggestion[]): string {
	if (!suggestions.length) return "";
	return suggestions[0].ambiguous ? "" : suggestions[0].guestId;
}

export type PhoneUpdateAction = "fill" | "same" | "skip" | "overwrite" | "none";

/** What applying `next` would do to a guest that currently has `existing`. */
export function phoneUpdateAction(
	existing: string | null,
	next: string | null,
	overwrite: boolean,
): PhoneUpdateAction {
	if (!next) return "none";
	if (!existing) return "fill";
	if (existing === next) return "same";
	return overwrite ? "overwrite" : "skip";
}
