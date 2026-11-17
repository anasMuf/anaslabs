import { describe, expect, it } from "vitest";
import {
	type ExistingGuest,
	guestNameKey,
	normalizeGuestPhone,
	parseGuestTable,
	planGuestImport,
	slugifyGuestName,
} from "./guest-import";

/** Shape of what Google Sheets puts on the clipboard for the Mila sheet. */
const MILA_TSV = [
	"NO\tNAMA\tKETERANGAN\tFISIK/DIGITAL\tSTATUS PENGIRIMAN",
	"1\tMiss Andin\tLainnya\tDigital\tFALSE",
	"2\tMiss Jumi\tLainnya\tDigital\tTRUE",
	"3\tMiss Rully & Mr Fran\tLainnya\tFisik\tFALSE",
	"4\tFatimah Afifatuththohiroh\tCSSMoRA\tDigital\tFALSE",
	"5\tBpk. Anton Y Tejakusuma\tBAM\tDigital\tTRUE",
].join("\n");

const NOW = "2026-11-17T10:00:00.000Z";

describe("parseGuestTable", () => {
	it("reads a tab-separated paste using the header names", () => {
		const result = parseGuestTable(MILA_TSV);

		expect(result.issue).toBeUndefined();
		expect(result.skipped).toBe(0);
		expect(result.rows).toHaveLength(5);
		expect(result.rows[0]).toEqual({
			rowNumber: 2,
			name: "Miss Andin",
			nameKey: "miss andin",
			groupName: "Lainnya",
			delivery: "digital",
			sent: false,
			phone: null,
		});
		expect(result.rows[1].sent).toBe(true);
		expect(result.rows[2].delivery).toBe("fisik");
		expect(result.rows[3].groupName).toBe("CSSMoRA");
	});

	it("accepts CSV with quoted cells and a different column order", () => {
		const csv = [
			"KETERANGAN,NAMA,FISIK/DIGITAL,NO HP",
			'"Keluarga, dekat","Anas & Mila",Digital,0812-3456-7890',
			'Lainnya,"Bpk. Jonathan, S.T.",Fisik,',
		].join("\r\n");

		const result = parseGuestTable(csv);

		expect(result.rows).toHaveLength(2);
		expect(result.rows[0].groupName).toBe("Keluarga, dekat");
		expect(result.rows[0].phone).toBe("6281234567890");
		expect(result.rows[1].name).toBe("Bpk. Jonathan, S.T.");
		expect(result.rows[1].delivery).toBe("fisik");
		expect(result.rows[1].phone).toBeNull();
	});

	it("treats an empty paste as an error rather than an empty import", () => {
		expect(parseGuestTable("   \n\n").issue).toBe("empty");
	});

	it("reports a missing NAMA header instead of guessing columns", () => {
		const result = parseGuestTable("NO\tKETERANGAN\n1\tLainnya");
		expect(result.issue).toBe("no-header");
		expect(result.rows).toHaveLength(0);
	});

	it("skips blank rows, numeric NO cells and repeated headers", () => {
		const paste = [
			"NAMA\tKETERANGAN",
			"1\t",
			"",
			"NAMA\tKETERANGAN",
			"Miss Adya\tLainnya",
		].join("\n");

		const result = parseGuestTable(paste);

		expect(result.rows.map((row) => row.name)).toEqual(["Miss Adya"]);
		expect(result.skipped).toBe(3);
	});

	it("merges the same name pasted twice and counts it", () => {
		const paste = [
			"NAMA\tKETERANGAN",
			"cak abid\tpondok mq",
			"  CAK ABID  \tpondok mq",
		].join("\n");

		const result = parseGuestTable(paste);

		expect(result.rows).toHaveLength(1);
		expect(result.duplicates).toBe(1);
	});

	it("defaults delivery to digital when the column is missing or blank", () => {
		const result = parseGuestTable("NAMA\tKETERANGAN\nwildan\tsetoyo");
		expect(result.rows[0].delivery).toBe("digital");
	});
});

describe("slugifyGuestName", () => {
	it("keeps names readable and URL-safe", () => {
		expect(slugifyGuestName("Miss Rully & Mr Fran")).toBe("miss-rully-mr-fran");
		expect(slugifyGuestName("Bpk. Anton Y Tejakusuma")).toBe(
			"bpk-anton-y-tejakusuma",
		);
		expect(slugifyGuestName("  Fatimah   Afifatuththohiroh ")).toBe(
			"fatimah-afifatuththohiroh",
		);
	});

	it("strips diacritics and quotes", () => {
		expect(slugifyGuestName("Syaifulloh Al-Azhar")).toBe("syaifulloh-al-azhar");
		expect(slugifyGuestName("A'isyah")).toBe("aisyah");
		expect(slugifyGuestName("José Ñuñez")).toBe("jose-nunez");
	});

	it("falls back to `tamu` when nothing usable is left", () => {
		expect(slugifyGuestName("***")).toBe("tamu");
		expect(slugifyGuestName("")).toBe("tamu");
	});

	it("keeps slugs short enough for a path segment", () => {
		const slug = slugifyGuestName("A".repeat(120));
		expect(slug.length).toBeLessThanOrEqual(48);
		expect(slug.endsWith("-")).toBe(false);
	});
});

describe("guestNameKey", () => {
	it("matches names regardless of case and spacing", () => {
		expect(guestNameKey("  Cak  Abid ")).toBe("cak abid");
		expect(guestNameKey("CAK ABID")).toBe(guestNameKey("cak abid"));
		expect(guestNameKey("Mas Agung.")).toBe("mas agung");
	});
});

describe("normalizeGuestPhone", () => {
	it("converts local numbers to the 62 country code", () => {
		expect(normalizeGuestPhone("0812-3456-7890")).toBe("6281234567890");
		expect(normalizeGuestPhone("+62 812 3456 7890")).toBe("6281234567890");
		expect(normalizeGuestPhone("6281234567890")).toBe("6281234567890");
		expect(normalizeGuestPhone("812 3456 7890")).toBe("6281234567890");
	});

	it("returns null for blanks and implausible values", () => {
		expect(normalizeGuestPhone("")).toBeNull();
		expect(normalizeGuestPhone(null)).toBeNull();
		expect(normalizeGuestPhone("0812")).toBeNull();
	});
});

describe("planGuestImport", () => {
	const existingGuest = (overrides: Partial<ExistingGuest>): ExistingGuest => ({
		id: "guest-1",
		slug: "cak-abid",
		name: "cak abid",
		nameKey: "cak abid",
		source: "anas",
		groupName: "pondok mq",
		delivery: "digital",
		phone: null,
		sentAt: null,
		archived: false,
		...overrides,
	});

	const row = (
		overrides: Partial<Parameters<typeof planGuestImport>[0][number]> = {},
	) => ({
		rowNumber: 2,
		name: "cak abid",
		nameKey: "cak abid",
		groupName: "pondok mq",
		delivery: "digital" as const,
		sent: false,
		phone: null,
		...overrides,
	});

	it("creates guests with name-only slugs", () => {
		const plan = planGuestImport(
			[
				row({
					name: "Miss Andin",
					nameKey: "miss andin",
					groupName: "Lainnya",
				}),
			],
			[],
			"mila",
			NOW,
		);

		expect(plan.create).toHaveLength(1);
		expect(plan.create[0].slug).toBe("miss-andin");
		expect(plan.create[0].sentAt).toBeNull();
		expect(plan.archive).toHaveLength(0);
	});

	it("suffixes a slug that another source already uses", () => {
		const plan = planGuestImport(
			[row()],
			[existingGuest({ source: "mila" })],
			"anas",
			NOW,
		);

		expect(plan.create[0].slug).toBe("cak-abid-2");
	});

	it("keeps the existing slug when the same guest is imported again", () => {
		const plan = planGuestImport(
			[row({ name: "Cak Abid" })],
			[existingGuest({})],
			"anas",
			NOW,
		);

		// Same nameKey: the guest is recognised, so the slug must not change.
		expect(plan.create).toHaveLength(0);
		expect(plan.update).toHaveLength(1);
		expect(plan.update[0].changes).toEqual(["nama"]);
	});

	it("reports nothing to do when the paste matches the database", () => {
		const plan = planGuestImport([row()], [existingGuest({})], "anas", NOW);
		expect(plan).toMatchObject({
			create: [],
			update: [],
			restore: [],
			archive: [],
			unchanged: 1,
		});
	});

	it("archives guests missing from the paste and restores them later", () => {
		const ghost = existingGuest({
			id: "guest-2",
			slug: "mas agung",
			name: "mas agung",
			nameKey: "mas agung",
		});

		const archivePlan = planGuestImport(
			[row()],
			[existingGuest({}), ghost],
			"anas",
			NOW,
		);
		expect(archivePlan.archive).toEqual([{ id: "guest-2", name: "mas agung" }]);

		const restorePlan = planGuestImport(
			[
				row(),
				row({
					rowNumber: 3,
					name: "mas agung",
					nameKey: "mas agung",
					groupName: null,
				}),
			],
			[existingGuest({}), { ...ghost, archived: true }],
			"anas",
			NOW,
		);
		expect(restorePlan.restore).toHaveLength(1);
		expect(restorePlan.restore[0].changes).toContain("pulih");
		expect(restorePlan.archive).toHaveLength(0);
	});

	it("never rewrites a slug because the name changed", () => {
		const plan = planGuestImport(
			[row({ name: "cak abid", nameKey: "cak abid" })],
			[
				existingGuest({
					name: "cak abid (pondok)",
					nameKey: "cak abid (pondok)",
				}),
			],
			"anas",
			NOW,
		);

		// Different nameKey means a new guest; the old row is archived, not renamed.
		expect(plan.create[0].slug).toBe("cak-abid-2");
		expect(plan.archive).toHaveLength(1);
	});

	it("keeps the first sent timestamp instead of resetting it", () => {
		const sent = planGuestImport(
			[row({ sent: true })],
			[existingGuest({})],
			"anas",
			NOW,
		);
		expect(sent.update[0].sentAt).toBe(NOW);

		const alreadySent = planGuestImport(
			[row({ sent: true })],
			[existingGuest({ sentAt: "2026-01-01T00:00:00.000Z" })],
			"anas",
			NOW,
		);
		// Already sent and otherwise identical: nothing to write.
		expect(alreadySent.update).toHaveLength(0);
		expect(alreadySent.unchanged).toBe(1);

		const unset = planGuestImport(
			[row({ sent: false })],
			[existingGuest({ sentAt: "2026-01-01T00:00:00.000Z" })],
			"anas",
			NOW,
		);
		expect(unset.update[0].sentAt).toBeNull();
		expect(unset.update[0].changes).toEqual(["status"]);
	});
});
