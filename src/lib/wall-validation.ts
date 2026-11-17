/**
 * Validation helpers for the photo wall.
 *
 * Everything here is pure so the rules can be unit tested without touching
 * Supabase: the server function stays a thin layer of I/O around these.
 */

export const WALL_MESSAGE_MAX = 280;
export const WALL_PHOTO_MAX_BYTES = 400 * 1024;
export const WALL_THUMB_MAX_BYTES = 80 * 1024;
export const WALL_AUDIO_MAX_BYTES = 1024 * 1024;
export const WALL_AUDIO_MAX_MS = 60_000;
export const WALL_MAX_CARDS = 300;
export const WALL_RATE_LIMIT = 5;
export const WALL_RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Deliberately short and high confidence: a wedding message that trips this
 * list is almost certainly intended as an insult, while mild words people use
 * jokingly are left to the admin delete button.
 */
export const BLOCKED_WORDS: readonly string[] = [
	"anjing",
	"anjg",
	"bangsat",
	"bgst",
	"kontol",
	"kntl",
	"memek",
	"mmk",
	"ngentot",
	"ngntd",
	"pler",
	"peler",
	"pepek",
	"jancok",
	"jancuk",
	"bajingan",
	"brengsek",
	"keparat",
	"lonte",
	"perek",
];

const URL_PATTERN = /(https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly)/i;
const DATA_URL = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i;

export type WallError =
	| "empty-message"
	| "message-too-long"
	| "message-blocked"
	| "message-link"
	| "invalid-photo"
	| "photo-too-large"
	| "invalid-thumb"
	| "thumb-too-large"
	| "invalid-audio"
	| "audio-too-large"
	| "audio-too-long";

/** Collapses whitespace and drops control characters so pasted text can't break the layout. */
export function normalizeMessage(input: string): string {
	let cleaned = "";
	for (const char of input) {
		const code = char.codePointAt(0) ?? 0;
		cleaned += code < 0x20 || code === 0x7f ? " " : char;
	}
	return cleaned.replace(/\s+/g, " ").trim();
}

export function hasLink(text: string): boolean {
	return URL_PATTERN.test(text);
}

/**
 * Word-level match: the text is lowercased, punctuation becomes a separator and
 * each token is compared against the list, so `asu` inside `asuransi` is safe.
 */
export function findBlockedWord(
	text: string,
	words: readonly string[] = BLOCKED_WORDS,
): string | null {
	const tokens = text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean);

	for (const token of tokens) {
		if (words.includes(token)) return token;
	}

	return null;
}

export interface ParsedDataUrl {
	mime: string;
	bytes: number;
	data: Uint8Array;
}

/** Decodes a `data:` URL and reports its real byte length (base64 inflates it by ~33%). */
export function parseDataUrl(input: string): ParsedDataUrl | null {
	const match = DATA_URL.exec(input);
	if (!match) return null;

	const [, mime, base64] = match;
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	const bytes = Math.floor((base64.length * 3) / 4) - padding;
	if (bytes <= 0) return null;

	// `atob` rather than Buffer so this module stays usable outside Node.
	const binary = atob(base64);
	const data = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) data[i] = binary.charCodeAt(i);

	return { mime: mime.toLowerCase(), bytes, data };
}

export interface WallPublishInput {
	slug: string;
	message: string;
	photo: string;
	thumb: string;
	audio?: string;
	audioDurationMs?: number;
}

export type WallValidation =
	| {
			ok: true;
			message: string;
			photo: ParsedDataUrl;
			thumb: ParsedDataUrl;
			audio?: ParsedDataUrl;
			audioDurationMs?: number;
	  }
	| { ok: false; error: WallError };

/** Single entry point so the server function and the tests agree on every rule. */
export function validateWallPublish(input: WallPublishInput): WallValidation {
	const message = normalizeMessage(input.message);

	if (!message) return { ok: false, error: "empty-message" };
	if (message.length > WALL_MESSAGE_MAX)
		return { ok: false, error: "message-too-long" };
	if (hasLink(message)) return { ok: false, error: "message-link" };
	if (findBlockedWord(message)) return { ok: false, error: "message-blocked" };

	const photo = parseDataUrl(input.photo);
	if (!photo || photo.mime !== "image/jpeg")
		return { ok: false, error: "invalid-photo" };
	if (photo.bytes > WALL_PHOTO_MAX_BYTES)
		return { ok: false, error: "photo-too-large" };

	const thumb = parseDataUrl(input.thumb);
	if (!thumb || thumb.mime !== "image/jpeg")
		return { ok: false, error: "invalid-thumb" };
	if (thumb.bytes > WALL_THUMB_MAX_BYTES)
		return { ok: false, error: "thumb-too-large" };

	if (input.audio) {
		const audio = parseDataUrl(input.audio);
		if (
			!audio ||
			!["audio/webm", "audio/mp4", "audio/ogg"].includes(audio.mime)
		) {
			return { ok: false, error: "invalid-audio" };
		}
		if (audio.bytes > WALL_AUDIO_MAX_BYTES)
			return { ok: false, error: "audio-too-large" };

		const duration = input.audioDurationMs ?? 0;
		if (
			!Number.isFinite(duration) ||
			duration <= 0 ||
			duration > WALL_AUDIO_MAX_MS
		) {
			return { ok: false, error: "audio-too-long" };
		}

		return {
			ok: true,
			message,
			photo,
			thumb,
			audio,
			audioDurationMs: Math.round(duration),
		};
	}

	return { ok: true, message, photo, thumb };
}

export const WALL_ERROR_MESSAGES: Record<WallError, string> = {
	"empty-message": "Tulis ucapan dulu ya.",
	"message-too-long": `Ucapan maksimal ${WALL_MESSAGE_MAX} karakter.`,
	"message-blocked": "Ucapan berisi kata yang tidak pantas, mohon diubah.",
	"message-link": "Link tidak diperbolehkan di ucapan.",
	"invalid-photo": "Foto tidak valid, coba ambil ulang.",
	"photo-too-large": "Foto terlalu besar, coba ambil ulang.",
	"invalid-thumb": "Thumbnail foto tidak valid.",
	"thumb-too-large": "Thumbnail foto terlalu besar.",
	"invalid-audio": "Format suara tidak didukung browser ini.",
	"audio-too-large": "Rekaman suara terlalu besar, coba lebih singkat.",
	"audio-too-long": "Rekaman suara maksimal 60 detik.",
};
