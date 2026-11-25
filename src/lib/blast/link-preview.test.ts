import { describe, expect, it } from "vitest";
import {
	buildLinkPreview,
	DEFAULT_LINK_VERSION,
	resolveLinkVersion,
} from "./link-preview";
import { DEFAULT_COUPLE_NAME } from "./template";

describe("buildLinkPreview", () => {
	it("falls back to the default title, description, and image", () => {
		const preview = buildLinkPreview({
			title: null,
			description: null,
			imageUrl: null,
		});

		expect(preview.title).toBe(`Undangan Pernikahan ${DEFAULT_COUPLE_NAME}`);
		expect(preview.imageUrl).toMatch(/\/invitation\/og-card\.jpg$/);
		expect(preview.description.length).toBeGreaterThan(0);
		expect(preview.host).toBe("anaslabs.my.id");
	});

	it("prefers configured metadata and trims whitespace", () => {
		const preview = buildLinkPreview({
			title: "  Undangan Anas & Mila  ",
			description: "  Kami menikah.  ",
			imageUrl: "  https://contoh.test/kartu.jpg  ",
		});

		expect(preview.title).toBe("Undangan Anas & Mila");
		expect(preview.description).toBe("Kami menikah.");
		expect(preview.imageUrl).toBe("https://contoh.test/kartu.jpg");
	});
});

describe("resolveLinkVersion", () => {
	it("uses the default when there is no timestamp", () => {
		expect(resolveLinkVersion(null)).toBe(DEFAULT_LINK_VERSION);
		expect(resolveLinkVersion(undefined)).toBe(DEFAULT_LINK_VERSION);
	});

	it("uses the timestamp so the preview cache is busted", () => {
		const updatedAt = "2026-11-24T13:48:56.000Z";
		expect(resolveLinkVersion(updatedAt)).toBe(String(Date.parse(updatedAt)));
	});

	it("ignores an unparsable timestamp", () => {
		expect(resolveLinkVersion("bukan tanggal")).toBe(DEFAULT_LINK_VERSION);
	});
});
