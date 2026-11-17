import { describe, expect, it } from "vitest";
import {
	SESSION_TTL_MS,
	signDashboardSession,
	verifyDashboardSession,
} from "./dashboard-session";

const SECRET = "rahasia-uji";
const now = 1_700_000_000_000;

function token(overrides: Partial<{ email: string; exp: number }> = {}) {
	return signDashboardSession(
		{
			email: overrides.email ?? "anas@example.com",
			exp: overrides.exp ?? now + 1000,
		},
		SECRET,
	);
}

describe("dashboard session", () => {
	it("round-trips a valid session", () => {
		expect(verifyDashboardSession(token(), SECRET, now)).toEqual({
			email: "anas@example.com",
			exp: now + 1000,
		});
	});

	it("exports a seven day lifetime", () => {
		expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
	});

	it("rejects an expired session", () => {
		expect(
			verifyDashboardSession(token({ exp: now - 1 }), SECRET, now),
		).toBeNull();
	});

	it("rejects a different secret", () => {
		expect(verifyDashboardSession(token(), "secret-lain", now)).toBeNull();
	});

	it("rejects a tampered payload", () => {
		const [payload, signature] = token().split(".");
		const forged = Buffer.from(
			JSON.stringify({ email: "penyusup@example.com", exp: now + 1000 }),
		).toString("base64url");
		expect(
			verifyDashboardSession(`${forged}.${signature}`, SECRET, now),
		).toBeNull();
		expect(payload).toBeTruthy();
	});

	it("rejects malformed tokens", () => {
		expect(verifyDashboardSession(undefined, SECRET, now)).toBeNull();
		expect(verifyDashboardSession("", SECRET, now)).toBeNull();
		expect(verifyDashboardSession("tanpa-titik", SECRET, now)).toBeNull();
		expect(verifyDashboardSession("a.", SECRET, now)).toBeNull();
	});
});
