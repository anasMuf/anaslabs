import { describe, expect, it } from "vitest";
import {
	FRAME_MAX_BYTES,
	frameObjectPath,
	MUSIC_MAX_BYTES,
	musicObjectPath,
	OG_MAX_BYTES,
	ogObjectPath,
	validateFrameUpload,
	validateMusicUpload,
	validateOgUpload,
} from "./invitation-upload";

describe("validateMusicUpload", () => {
	it("accepts a supported MIME type", () => {
		const result = validateMusicUpload({
			mime: "audio/mpeg",
			size: 1024 * 1024,
		});

		expect(result).toEqual({
			ok: true,
			mime: "audio/mpeg",
			ext: "mp3",
			size: 1024 * 1024,
		});
	});

	it("normalizes case and whitespace", () => {
		const result = validateMusicUpload({
			mime: " Audio/MP4 ",
			size: 2048,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.ext).toBe("m4a");
	});

	it("rejects non-audio files", () => {
		const result = validateMusicUpload({ mime: "image/png", size: 2048 });

		expect(result.ok).toBe(false);
	});

	it("rejects files over the size limit", () => {
		const result = validateMusicUpload({
			mime: "audio/mpeg",
			size: MUSIC_MAX_BYTES + 1,
		});

		expect(result.ok).toBe(false);
	});

	it("rejects empty or invalid sizes", () => {
		expect(validateMusicUpload({ mime: "audio/mpeg", size: 0 }).ok).toBe(false);
		expect(
			validateMusicUpload({ mime: "audio/mpeg", size: Number.NaN }).ok,
		).toBe(false);
	});
});

describe("musicObjectPath", () => {
	it("builds a flat path under music/", () => {
		expect(musicObjectPath("mp3", "123e4567-e89b-12d3-a456-426614174000")).toBe(
			"music/123e4567-e89b-12d3-a456-426614174000.mp3",
		);
	});

	it("rejects path traversal and bad extensions", () => {
		expect(() => musicObjectPath("../mp3", "123e4567-e89b")).toThrow();
		expect(() => musicObjectPath("mp3", "../../secret")).toThrow();
	});
});

describe("validateFrameUpload", () => {
	it("accepts PNG, WebP and JPEG", () => {
		expect(
			validateFrameUpload({ mime: "image/png", size: 1024 }),
		).toMatchObject({ ok: true, ext: "png" });
		expect(
			validateFrameUpload({ mime: "image/webp", size: 1024 }),
		).toMatchObject({ ok: true, ext: "webp" });
		expect(
			validateFrameUpload({ mime: "image/jpeg", size: 1024 }),
		).toMatchObject({ ok: true, ext: "jpg" });
	});

	it("rejects other image types", () => {
		expect(validateFrameUpload({ mime: "image/gif", size: 1024 }).ok).toBe(
			false,
		);
	});

	it("rejects files over the frame limit", () => {
		expect(
			validateFrameUpload({ mime: "image/png", size: FRAME_MAX_BYTES + 1 }).ok,
		).toBe(false);
	});
});

describe("frameObjectPath", () => {
	it("builds a flat path under frames/", () => {
		expect(frameObjectPath("png", "123e4567-e89b-12d3-a456-426614174000")).toBe(
			"frames/123e4567-e89b-12d3-a456-426614174000.png",
		);
		expect(frameObjectPath("jpg", "123e4567-e89b-12d3-a456-426614174000")).toBe(
			"frames/123e4567-e89b-12d3-a456-426614174000.jpg",
		);
	});

	it("rejects traversal", () => {
		expect(() => frameObjectPath("../png", "123e4567-e89b")).toThrow();
	});
});

describe("validateOgUpload", () => {
	it("accepts PNG, WebP and JPEG", () => {
		expect(validateOgUpload({ mime: "image/png", size: 1024 })).toMatchObject({
			ok: true,
			ext: "png",
		});
		expect(validateOgUpload({ mime: "image/jpeg", size: 1024 })).toMatchObject({
			ok: true,
			ext: "jpg",
		});
	});

	it("rejects unsupported or oversized files", () => {
		expect(validateOgUpload({ mime: "image/gif", size: 1024 }).ok).toBe(false);
		expect(
			validateOgUpload({ mime: "image/png", size: OG_MAX_BYTES + 1 }).ok,
		).toBe(false);
	});
});

describe("ogObjectPath", () => {
	it("builds a flat path under og/", () => {
		expect(ogObjectPath("png", "123e4567-e89b-12d3-a456-426614174000")).toBe(
			"og/123e4567-e89b-12d3-a456-426614174000.png",
		);
	});

	it("rejects traversal", () => {
		expect(() => ogObjectPath("../png", "123e4567-e89b")).toThrow();
	});
});
