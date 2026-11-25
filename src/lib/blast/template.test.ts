import { describe, expect, it } from "vitest";
import {
	DEFAULT_COUPLE_NAME,
	DEFAULT_TEMPLATES,
	renderTemplate,
	TEMPLATE_MAX_LENGTH,
	unknownVariables,
	validateTemplate,
} from "./template";

const guest = {
	name: "Budi Santoso",
	groupName: "Unhasy",
	address: "Jombang",
	invited: "Sekalian",
	slug: "budi-santoso",
};

describe("validateTemplate", () => {
	it("accepts the default template for both channels", () => {
		expect(validateTemplate(DEFAULT_TEMPLATES.anas).ok).toBe(true);
		expect(validateTemplate(DEFAULT_TEMPLATES.mila).ok).toBe(true);
	});

	it("rejects an empty template", () => {
		expect(validateTemplate("   ").ok).toBe(false);
	});

	it("rejects a too-long message", () => {
		const result = validateTemplate("a".repeat(TEMPLATE_MAX_LENGTH + 1));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/maksimal/);
	});

	it("rejects unknown variables", () => {
		const result = validateTemplate("Halo {nama}, ini {password}");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("{password}");
	});

	it("normalises line endings and trims", () => {
		const result = validateTemplate("  Halo {nama}\r\n");
		expect(result).toEqual({ ok: true, body: "Halo {nama}" });
	});
});

describe("renderTemplate", () => {
	it("replaces every supported variable", () => {
		const body = "{nama}|{grup}|{alamat}|{diundang}|{link}|{mempelai}";
		expect(renderTemplate(body, guest)).toBe(
			`Budi Santoso|Unhasy|Jombang|Sekalian|https://anaslabs.my.id/invitation/budi-santoso|${DEFAULT_COUPLE_NAME}`,
		);
	});

	it("uses safe fallbacks for empty columns", () => {
		const body = "{grup}|{alamat}|{diundang}";
		expect(
			renderTemplate(body, {
				...guest,
				groupName: null,
				address: null,
				invited: null,
			}),
		).toBe("tamu|-|-");
	});

	it("accepts a custom site url and couple name", () => {
		const body = "{link}|{mempelai}";
		expect(
			renderTemplate(body, guest, {
				siteUrl: "https://contoh.test",
				coupleName: "A & B",
			}),
		).toBe("https://contoh.test/invitation/budi-santoso|A & B");
	});

	it("renders a clean guest link without a query string", () => {
		// `?v=...` membuat `send-link` Wablas mengirim JSON mentah, bukan kartu.
		expect(renderTemplate("{link}", guest)).toBe(
			"https://anaslabs.my.id/invitation/budi-santoso",
		);
	});

	it("is case-insensitive for variable names", () => {
		expect(renderTemplate("Halo {NAMA}", guest)).toBe("Halo Budi Santoso");
	});

	it("leaves unknown placeholders untouched", () => {
		expect(renderTemplate("Halo {nama} {lain}", guest)).toBe(
			"Halo Budi Santoso {lain}",
		);
	});
});

describe("unknownVariables", () => {
	it("lists each unknown placeholder once", () => {
		expect(unknownVariables("{nama} {x} {x} {Y}")).toEqual(["{x}", "{Y}"]);
	});
});
