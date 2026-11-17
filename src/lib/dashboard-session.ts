import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Dashboard session token: `base64url(payload).base64url(hmac)`.
 *
 * Deliberately not a JWT and not a Supabase token: the browser only ever holds
 * this opaque string in an httpOnly cookie, so a stolen Supabase access token is
 * useless for our dashboard and an XSS cannot read the session.
 */

export const DASHBOARD_COOKIE = "dash_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface DashboardSessionPayload {
	email: string;
	/** Epoch milliseconds. */
	exp: number;
}

function base64url(input: Buffer | string): string {
	return Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
	return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function signature(payloadPart: string, secret: string): Buffer {
	return createHmac("sha256", secret).update(payloadPart).digest();
}

export function signDashboardSession(
	payload: DashboardSessionPayload,
	secret: string,
): string {
	const payloadPart = base64url(JSON.stringify(payload));
	return `${payloadPart}.${base64url(signature(payloadPart, secret))}`;
}

export function verifyDashboardSession(
	token: string | undefined | null,
	secret: string,
	now: number = Date.now(),
): DashboardSessionPayload | null {
	if (!token) return null;

	const separator = token.lastIndexOf(".");
	if (separator <= 0) return null;

	const payloadPart = token.slice(0, separator);
	const signaturePart = token.slice(separator + 1);
	if (!signaturePart) return null;

	const expected = signature(payloadPart, secret);
	const given = fromBase64url(signaturePart);
	if (given.length !== expected.length) return null;
	if (!timingSafeEqual(given, expected)) return null;

	try {
		const parsed = JSON.parse(
			fromBase64url(payloadPart).toString("utf8"),
		) as DashboardSessionPayload;

		if (typeof parsed.email !== "string" || !parsed.email) return null;
		if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;

		return parsed;
	} catch {
		return null;
	}
}

/** Only `DASHBOARD_EMAILS` may open the dashboard. Empty list locks everyone out. */
export function isAllowedDashboardEmail(
	email: string,
	allowlist: string | undefined,
): boolean {
	if (!allowlist) return false;
	const wanted = email.trim().toLowerCase();
	if (!wanted) return false;

	return allowlist
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean)
		.includes(wanted);
}
