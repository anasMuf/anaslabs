import { describe, expect, it } from "vitest";
import {
	BLOCKED_WORDS,
	findBlockedWord,
	hasLink,
	normalizeMessage,
	parseDataUrl,
	validateWallPublish,
	WALL_MESSAGE_MAX,
} from "./wall-validation";

/** Smallest valid JPEG-looking payload; the size checks only care about bytes. */
function dataUrl(mime: string, bytes: number): string {
	const base64 = "A".repeat(Math.ceil((bytes * 4) / 3));
	return `data:${mime};base64,${base64}`;
}

const photo = dataUrl("image/jpeg", 120 * 1024);
const thumb = dataUrl("image/jpeg", 20 * 1024);

describe("normalizeMessage", () => {
	it("collapses whitespace and trims", () => {
		expect(normalizeMessage("  Selamat   ya,\n\tsemoga  ")).toBe(
			"Selamat ya, semoga",
		);
	});

	it("drops control characters instead of letting them reach the DOM", () => {
		expect(normalizeMessage("a\u0000b\u001Fc")).toBe("a b c");
	});
});

describe("hasLink", () => {
	it("detects http, www and shorteners", () => {
		expect(hasLink("cek https://x.com")).toBe(true);
		expect(hasLink("lihat www.abc.id")).toBe(true);
		expect(hasLink("wa.me/62812")).toBe(true);
	});

	it("leaves normal congratulation text alone", () => {
		expect(hasLink("Selamat menempuh hidup baru!")).toBe(false);
	});
});

describe("findBlockedWord", () => {
	it("matches whole words only", () => {
		expect(findBlockedWord("dasar anjing", BLOCKED_WORDS)).toBe("anjing");
		expect(findBlockedWord("saya punya asuransi", BLOCKED_WORDS)).toBeNull();
	});

	it("ignores punctuation and casing", () => {
		expect(findBlockedWord("Anjing!!!", BLOCKED_WORDS)).toBe("anjing");
	});
});

describe("parseDataUrl", () => {
	it("reports mime and decoded byte length", () => {
		const parsed = parseDataUrl(dataUrl("image/jpeg", 1024));
		expect(parsed?.mime).toBe("image/jpeg");
		expect(parsed?.bytes).toBe(1024);
		expect(parsed?.data.length).toBe(1024);
	});

	it("rejects non data URLs and non base64 payloads", () => {
		expect(parseDataUrl("https://x.com/a.jpg")).toBeNull();
		expect(parseDataUrl("data:image/jpeg,abc")).toBeNull();
	});
});

describe("validateWallPublish", () => {
	const base = { slug: "test", message: "Selamat ya!", photo, thumb };

	it("accepts a well formed card", () => {
		const result = validateWallPublish(base);
		expect(result.ok).toBe(true);
	});

	it("rejects a card with neither a message nor audio", () => {
		expect(validateWallPublish({ ...base, message: "   " })).toEqual({
			ok: false,
			error: "empty-message",
		});
	});

	it("accepts a photo that only carries a voice note", () => {
		const result = validateWallPublish({
			...base,
			message: "  ",
			audio: dataUrl("audio/webm", 90 * 1024),
			audioDurationMs: 12_000,
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.message).toBe("");
	});

	it("rejects a message over the limit", () => {
		expect(
			validateWallPublish({
				...base,
				message: "a".repeat(WALL_MESSAGE_MAX + 1),
			}),
		).toEqual({ ok: false, error: "message-too-long" });
	});

	it("rejects links and blocked words", () => {
		expect(
			validateWallPublish({ ...base, message: "cek https://spam" }),
		).toEqual({
			ok: false,
			error: "message-link",
		});
		expect(validateWallPublish({ ...base, message: "dasar bangsat" })).toEqual({
			ok: false,
			error: "message-blocked",
		});
	});

	it("rejects a photo that is not jpeg or too large", () => {
		expect(
			validateWallPublish({ ...base, photo: dataUrl("image/png", 10 * 1024) }),
		).toEqual({ ok: false, error: "invalid-photo" });
		expect(
			validateWallPublish({
				...base,
				photo: dataUrl("image/jpeg", 500 * 1024),
			}),
		).toEqual({ ok: false, error: "photo-too-large" });
	});

	it("rejects a broken thumbnail", () => {
		expect(validateWallPublish({ ...base, thumb: "not-a-data-url" })).toEqual({
			ok: false,
			error: "invalid-thumb",
		});
	});

	it("accepts audio within limits and keeps its duration", () => {
		const result = validateWallPublish({
			...base,
			audio: dataUrl("audio/webm", 90 * 1024),
			audioDurationMs: 24_500,
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.audioDurationMs).toBe(24_500);
	});

	it("rejects unsupported audio, oversized audio and long clips", () => {
		expect(
			validateWallPublish({
				...base,
				audio: dataUrl("audio/wav", 40 * 1024),
				audioDurationMs: 10_000,
			}),
		).toEqual({ ok: false, error: "invalid-audio" });

		expect(
			validateWallPublish({
				...base,
				audio: dataUrl("audio/webm", 1200 * 1024),
				audioDurationMs: 10_000,
			}),
		).toEqual({ ok: false, error: "audio-too-large" });

		expect(
			validateWallPublish({
				...base,
				audio: dataUrl("audio/webm", 90 * 1024),
				audioDurationMs: 61_000,
			}),
		).toEqual({ ok: false, error: "audio-too-long" });
	});
});
