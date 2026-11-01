import { describe, expect, it } from "vitest";
import { buildPhotoboothSettings } from "#/lib/photobooth/draw-composition";
import {
	collectPhotoboothFontRequests,
	loadPhotoboothFonts,
} from "#/lib/photobooth/fonts";
import type { PhotoboothConfig } from "#/lib/photobooth/types";

const config: PhotoboothConfig = {
	scale: 3,
	downloadName: "test",
	card: {
		eyebrow: "THE WEDDING OF",
		names: "Anas & Mila",
		date: "19 - 20 Desember 2026",
	},
	layouts: {
		1: {
			width: 348,
			height: 530,
			textY: 448,
			slots: [{ x: 26, y: 32, w: 296, h: 393 }],
		},
		2: {
			width: 348,
			height: 542,
			textY: 454,
			slots: [
				{ x: 26, y: 38, w: 296, h: 193 },
				{ x: 26, y: 238, w: 296, h: 193 },
			],
		},
		4: {
			width: 348,
			height: 535,
			textY: 450,
			slots: [
				{ x: 26, y: 35, w: 144, h: 192 },
				{ x: 177, y: 35, w: 144, h: 192 },
				{ x: 26, y: 234, w: 144, h: 192 },
				{ x: 177, y: 234, w: 144, h: 192 },
			],
		},
	},
};

const settings = buildPhotoboothSettings(config);

describe("collectPhotoboothFontRequests", () => {
	it("requests one face per distinct font and sample text", () => {
		const requests = collectPhotoboothFontRequests(settings);

		// The three card lines repeat across layouts; they dedupe by font + text.
		expect(requests).toHaveLength(3);
		expect(requests.map((request) => request.text).sort()).toEqual([
			"19 - 20 Desember 2026",
			"Anas & Mila",
			"THE WEDDING OF",
		]);
	});

	it("uses the real line text so the correct unicode-range subset loads", () => {
		const requests = collectPhotoboothFontRequests(settings);
		const names = requests.find((request) => request.text === "Anas & Mila");

		expect(names?.font).toBe('400 18px "Playfair Display Variable"');
		expect(
			requests.some((request) => request.font.includes("Montserrat")),
		).toBe(true);
	});
});

describe("loadPhotoboothFonts", () => {
	it("reports failure when the environment has no font set", async () => {
		expect(typeof document).toBe("undefined");
		await expect(loadPhotoboothFonts(settings)).resolves.toBe(false);
	});
});
