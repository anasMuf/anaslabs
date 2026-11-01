import { describe, expect, it } from "vitest";
import {
	buildPhotoboothSettings,
	cameraCropRect,
	coverRect,
	slotAspect,
} from "#/lib/photobooth/draw-composition";
import type { PhotoboothConfig } from "#/lib/photobooth/types";

const config: PhotoboothConfig = {
	scale: 3,
	downloadName: "test",
	card: { eyebrow: "THE WEDDING OF", names: "A & B", date: "1 Januari 2027" },
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

describe("buildPhotoboothSettings", () => {
	const settings = buildPhotoboothSettings(config);

	it("keeps the Figma card geometry and applies the output scale", () => {
		expect(settings.layouts[1].canvas).toEqual({
			width: 348,
			height: 530,
			radius: 10,
			background: "#FFFFFF",
		});
		expect(settings.layouts[1].scale).toBe(3);
		expect(settings.layouts[2].slots).toHaveLength(2);
		expect(settings.layouts[4].slots).toHaveLength(4);
	});

	it("places the three text lines relative to the layout text origin", () => {
		const [eyebrow, names, date] = settings.layouts[2].text;
		expect(eyebrow.y).toBe(454);
		expect(names.y).toBe(470);
		expect(date.y).toBe(495);
		expect(eyebrow.value).toBe("THE WEDDING OF");
		expect(eyebrow.letterSpacing).toBeCloseTo(0.8);
		expect(names.fontFamily).toBe("Playfair Display Variable");
		expect(date.fontFamily).toBe("Montserrat Variable");
	});

	it("copies slots so callers cannot mutate the shared config", () => {
		const layout = buildPhotoboothSettings(config).layouts[1];
		layout.slots[0].x = 999;
		expect(config.layouts[1].slots[0].x).toBe(26);
	});
});

describe("coverRect", () => {
	it("crops the sides of a wider source", () => {
		expect(coverRect(1600, 900, 100, 100)).toEqual({
			x: 350,
			y: 0,
			width: 900,
			height: 900,
		});
	});

	it("crops the top and bottom of a taller source", () => {
		expect(coverRect(900, 1600, 100, 100)).toEqual({
			x: 0,
			y: 350,
			width: 900,
			height: 900,
		});
	});

	it("returns an empty rect when any size is invalid", () => {
		expect(coverRect(0, 900, 100, 100)).toEqual({
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		});
	});
});

describe("cameraCropRect", () => {
	it("stays inside the visible camera area and keeps the slot aspect", () => {
		const rect = cameraCropRect(1920, 1080, 390 / 554, 296 / 393);
		const visible = coverRect(1920, 1080, 390 / 554, 1);

		expect(rect.x).toBeGreaterThanOrEqual(visible.x);
		expect(rect.y).toBeGreaterThanOrEqual(visible.y);
		expect(rect.x + rect.width).toBeLessThanOrEqual(visible.x + visible.width);
		expect(rect.y + rect.height).toBeLessThanOrEqual(
			visible.y + visible.height,
		);
		expect(rect.width / rect.height).toBeCloseTo(296 / 393, 5);
	});
});

describe("slotAspect", () => {
	it("derives the guide ratio from the first slot", () => {
		expect(slotAspect(buildPhotoboothSettings(config).layouts[1])).toBeCloseTo(
			296 / 393,
		);
	});
});
