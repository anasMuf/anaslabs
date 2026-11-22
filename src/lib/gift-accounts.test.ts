import { describe, expect, it } from "vitest";
import { resolveGiftAccountNumber } from "#/lib/gift-accounts";

describe("resolveGiftAccountNumber", () => {
	it("returns the number for a published bank", () => {
		expect(resolveGiftAccountNumber("BCA")).toBe("0500576880");
		expect(resolveGiftAccountNumber("BSI")).toBe("7262729588");
	});

	it("normalises casing and surrounding whitespace", () => {
		expect(resolveGiftAccountNumber("  bca ")).toBe("0500576880");
		expect(resolveGiftAccountNumber("bsi")).toBe("7262729588");
	});

	it("returns null for banks that are not published", () => {
		expect(resolveGiftAccountNumber("BNI")).toBeNull();
		expect(resolveGiftAccountNumber("")).toBeNull();
		expect(resolveGiftAccountNumber("   ")).toBeNull();
	});
});
