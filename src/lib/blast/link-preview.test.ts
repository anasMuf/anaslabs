import { describe, expect, it } from "vitest";
import {
	buildLinkPreview,
	DEFAULT_LINK_VERSION,
	defaultOgImageUrl,
	prepareLinkPreviewMessage,
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
		expect(preview.imageUrl).toBe(defaultOgImageUrl());
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

describe("defaultOgImageUrl", () => {
	it("uses the default version when none is given", () => {
		expect(defaultOgImageUrl()).toBe(
			`https://anaslabs.my.id/invitation/og-card.jpg?v=${DEFAULT_LINK_VERSION}`,
		);
	});

	it("cache-busts the image with the given version", () => {
		expect(defaultOgImageUrl("1795526657943")).toContain(
			"og-card.jpg?v=1795526657943",
		);
		const preview = buildLinkPreview(
			{ title: null, description: null, imageUrl: null },
			"1795526657943",
		);
		expect(preview.imageUrl).toContain("?v=1795526657943");
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

describe("prepareLinkPreviewMessage", () => {
	it("leaves a message without a URL untouched", () => {
		expect(prepareLinkPreviewMessage("Halo Budi")).toEqual({
			text: "Halo Budi",
			url: null,
		});
	});

	it("moves a dangling link label to the end", () => {
		const message =
			"Assalamu'alaikum Alan,\n\nBuka undangan: https://anaslabs.my.id/invitation/alan\n\nTerima kasih.";
		expect(prepareLinkPreviewMessage(message)).toEqual({
			text: "Assalamu'alaikum Alan,\n\nTerima kasih.\n\nBuka undangan:",
			url: "https://anaslabs.my.id/invitation/alan",
		});
	});

	it("handles a message that is only a URL", () => {
		expect(
			prepareLinkPreviewMessage("https://anaslabs.my.id/invitation/alan"),
		).toEqual({
			text: "",
			url: "https://anaslabs.my.id/invitation/alan",
		});
	});

	it("keeps inline sentence text while removing the URL", () => {
		expect(
			prepareLinkPreviewMessage(
				"Silakan buka https://anaslabs.my.id/invitation/alan ya",
			),
		).toEqual({
			text: "Silakan buka ya",
			url: "https://anaslabs.my.id/invitation/alan",
		});
	});

	it("keeps a dangling link label on its own line", () => {
		expect(
			prepareLinkPreviewMessage(
				"Assalamu'alaikum,\n\nBuka undangan:\nhttps://anaslabs.my.id/invitation/alan",
			),
		).toEqual({
			text: "Assalamu'alaikum,\n\nBuka undangan:",
			url: "https://anaslabs.my.id/invitation/alan",
		});
	});
});
