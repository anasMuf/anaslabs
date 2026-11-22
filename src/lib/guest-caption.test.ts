import { describe, expect, it } from "vitest";
import { guestCoverCaption } from "./guest-caption";

describe("guestCoverCaption", () => {
	it("uses the group by default", () => {
		expect(guestCoverCaption("Almadinah", "JOMBANG")).toBe("Almadinah");
		expect(guestCoverCaption("Pondok MQ", null)).toBe("Pondok MQ");
	});

	it("uses the address when the group is the catch-all", () => {
		expect(guestCoverCaption("Lainnya", "SURABAYA")).toBe("SURABAYA");
		expect(guestCoverCaption("lainnya", "MOJOKERTO")).toBe("MOJOKERTO");
		expect(guestCoverCaption("Keluarga Lainnya", "PARE")).toBe("PARE");
	});

	it("keeps the group when a catch-all has no address", () => {
		expect(guestCoverCaption("Lainnya", null)).toBe("Lainnya");
		expect(guestCoverCaption("Lainnya", "   ")).toBe("Lainnya");
	});

	it("falls back to the address when the group is empty", () => {
		expect(guestCoverCaption(null, "TULUNGAGUNG")).toBe("TULUNGAGUNG");
		expect(guestCoverCaption("  ", "TARIK")).toBe("TARIK");
	});

	it("returns null when both are empty", () => {
		expect(guestCoverCaption(null, null)).toBeNull();
		expect(guestCoverCaption("", "  ")).toBeNull();
	});
});
