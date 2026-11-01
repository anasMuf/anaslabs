import { describe, expect, it } from "vitest";
import { resolveGuest } from "#/data/invitation-guests";
import { formatCoverDateRange, formatEventDate } from "#/lib/invitation";

describe("resolveGuest", () => {
	it("returns the guest for an invited slug", () => {
		expect(resolveGuest("anas-dan-keluarga")).toEqual({
			name: "Anas & Keluarga",
		});
	});

	it("normalises casing and surrounding whitespace", () => {
		expect(resolveGuest("  MILA-DAN-KELUARGA ")).toEqual({
			name: "Mila & Keluarga",
		});
	});

	it("returns null for unknown or empty slugs", () => {
		expect(resolveGuest("bukan-tamu")).toBeNull();
		expect(resolveGuest("")).toBeNull();
		expect(resolveGuest("   ")).toBeNull();
	});
});

describe("formatEventDate", () => {
	it("formats a date-only ISO string in Indonesian", () => {
		expect(formatEventDate("2026-12-19")).toBe("Sabtu, 19 Desember 2026");
	});

	it("keeps the design's 'Ahad' wording for Sunday", () => {
		expect(formatEventDate("2026-12-20")).toBe("Ahad, 20 Desember 2026");
	});

	it("does not shift the day across timezones", () => {
		// Date-only values are parsed in UTC, so the rendered day never moves.
		expect(formatEventDate("2027-01-01")).toBe("Jumat, 1 Januari 2027");
	});

	it("returns an empty string for invalid input", () => {
		expect(formatEventDate("2026-02-31")).toBe("");
		expect(formatEventDate("19-12-2026")).toBe("");
		expect(formatEventDate("")).toBe("");
	});
});

describe("formatCoverDateRange", () => {
	it("collapses a range inside one month", () => {
		expect(formatCoverDateRange("2026-12-19", "2026-12-20")).toBe(
			"19 - 20 Desember 2026",
		);
	});

	it("falls back to the full date for a single day", () => {
		expect(formatCoverDateRange("2026-12-19", "2026-12-19")).toBe(
			"Sabtu, 19 Desember 2026",
		);
	});

	it("spans months and years", () => {
		expect(formatCoverDateRange("2026-12-30", "2027-01-02")).toBe(
			"30 Desember - 2 Januari 2027",
		);
	});

	it("returns an empty string when the start date is invalid", () => {
		expect(formatCoverDateRange("bukan-tanggal", "2026-12-20")).toBe("");
	});
});
