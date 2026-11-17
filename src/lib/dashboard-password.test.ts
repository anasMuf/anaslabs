import { describe, expect, it } from "vitest";
import {
	hashDashboardPassword,
	verifyDashboardPassword,
} from "./dashboard-password";

describe("dashboard password", () => {
	it("verifies the password it hashed", () => {
		const stored = hashDashboardPassword("kata-sandi-panjang");
		expect(stored.startsWith("scrypt:")).toBe(true);
		expect(verifyDashboardPassword("kata-sandi-panjang", stored)).toBe(true);
	});

	it("rejects a wrong password", () => {
		const stored = hashDashboardPassword("kata-sandi-panjang");
		expect(verifyDashboardPassword("kata-sandi-lain", stored)).toBe(false);
	});

	it("uses a fresh salt per hash", () => {
		const a = hashDashboardPassword("sama");
		const b = hashDashboardPassword("sama");
		expect(a).not.toBe(b);
		expect(verifyDashboardPassword("sama", b)).toBe(true);
	});

	it("still accepts the legacy dollar separator", () => {
		const legacy = hashDashboardPassword("spasi").replaceAll(":", "$");
		expect(verifyDashboardPassword("spasi", legacy)).toBe(true);
		expect(verifyDashboardPassword("spasi", `  ${legacy}\n`)).toBe(true);
	});

	it("rejects malformed stored values without throwing", () => {
		for (const stored of [
			undefined,
			"",
			"plaintext",
			"scrypt:16384:8:1:onlyfive",
			"bcrypt:16384:8:1:c2FsdA==:aGFzaA==",
			"scrypt:0:8:1:c2FsdA==:aGFzaA==",
			"scrypt:16384:8:1:c2FsdA==:dG9vLXNob3J0",
		]) {
			expect(verifyDashboardPassword("apa-saja", stored)).toBe(false);
		}
	});

	it("refuses to hash an empty password", () => {
		expect(() => hashDashboardPassword("")).toThrow();
	});
});
