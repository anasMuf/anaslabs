import { createServerFn } from "@tanstack/react-start";
import {
	deleteCookie,
	getCookie,
	getRequest,
	setCookie,
} from "@tanstack/react-start/server";
import { verifyDashboardPassword } from "./dashboard-password";
import {
	DASHBOARD_COOKIE,
	isAllowedDashboardEmail,
	parseDashboardAllowlist,
	SESSION_TTL_MS,
	signDashboardSession,
	verifyDashboardSession,
} from "./dashboard-session";
import {
	checkRateLimit,
	type RateLimitState,
	recordAttempt,
} from "./rate-limit";

/**
 * Dashboard auth server functions.
 *
 * The browser signs in with Supabase (magic link) and hands the resulting access
 * token over exactly once; from then on the session is our own signed httpOnly
 * cookie, so no Supabase token lives in JavaScript for the rest of the visit.
 */

export interface DashboardUser {
	email: string;
}

export interface DashboardAuthConfigPublic {
	url: string;
	publishableKey: string;
}

export type DashboardLoginMode = "password" | "magic-link" | "none";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, RateLimitState>();

function identity(): string {
	return process.env.DASHBOARD_IDENTITY?.trim() || "Admin";
}

function clientKey(): string {
	try {
		const request = getRequest();
		const forwarded = request.headers.get("x-forwarded-for");
		if (forwarded) return forwarded.split(",")[0].trim();
		return request.headers.get("x-real-ip") ?? "lokal";
	} catch {
		return "lokal";
	}
}

/** Which login form to show; password mode wins when a hash is configured. */
export const getDashboardLoginMode = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ mode: DashboardLoginMode; identity: string }> => {
		if (process.env.DASHBOARD_PASSWORD_HASH) {
			return { mode: "password", identity: identity() };
		}

		const canMagicLink = Boolean(
			process.env.SUPABASE_URL &&
				process.env.SUPABASE_PUBLISHABLE_KEY &&
				parseDashboardAllowlist(process.env.DASHBOARD_EMAILS).length > 0,
		);

		return { mode: canMagicLink ? "magic-link" : "none", identity: identity() };
	},
);

/** Public Supabase Auth config for the browser; `null` means not configured. */
export const getDashboardAuthConfig = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardAuthConfigPublic | null> => {
		const url = process.env.SUPABASE_URL;
		const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
		if (!url || !publishableKey) return null;

		return { url, publishableKey };
	},
);

type CreateResult = { ok: true; email: string } | { ok: false; error: string };

function sessionSecret(): string | null {
	const secret = process.env.DASHBOARD_SESSION_SECRET;
	return secret && secret.length >= 16 ? secret : null;
}

export const getDashboardUser = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardUser | null> => {
		const secret = sessionSecret();
		if (!secret) return null;

		const session = verifyDashboardSession(getCookie(DASHBOARD_COOKIE), secret);
		if (!session) return null;

		// Password mode has no per-user email; the signed cookie is the identity.
		if (process.env.DASHBOARD_PASSWORD_HASH) {
			return { email: session.email };
		}

		// Re-check the allowlist on every read so removing an email in the env
		// invalidates an already-issued cookie.
		if (!isAllowedDashboardEmail(session.email, process.env.DASHBOARD_EMAILS)) {
			return null;
		}

		return { email: session.email };
	},
);

export const createDashboardSession = createServerFn({ method: "POST" })
	.inputValidator((data: { accessToken: string }) => ({
		accessToken: String(data?.accessToken ?? ""),
	}))
	.handler(async ({ data }): Promise<CreateResult> => {
		const secret = sessionSecret();
		if (!secret) {
			return {
				ok: false,
				error: "DASHBOARD_SESSION_SECRET belum diset di server.",
			};
		}

		const url = process.env.SUPABASE_URL;
		const adminKey = process.env.SUPABASE_SECRET_KEY;
		if (!url || !adminKey) {
			return { ok: false, error: "Supabase belum dikonfigurasi di server." };
		}
		if (!data.accessToken) {
			return { ok: false, error: "Token login tidak ditemukan." };
		}

		let email: string | undefined;
		try {
			// Verify the token against Supabase itself; never trust a client payload.
			const response = await fetch(`${url}/auth/v1/user`, {
				headers: {
					apikey: adminKey,
					Authorization: `Bearer ${data.accessToken}`,
				},
			});
			if (!response.ok) {
				return {
					ok: false,
					error: "Sesi Supabase tidak valid atau sudah kedaluwarsa.",
				};
			}
			const user = (await response.json()) as { email?: string | null };
			email = user.email?.trim().toLowerCase();
		} catch {
			return { ok: false, error: "Gagal memverifikasi sesi ke Supabase." };
		}

		if (!email) {
			return { ok: false, error: "Akun ini tidak punya alamat email." };
		}

		const allowlist = parseDashboardAllowlist(process.env.DASHBOARD_EMAILS);
		if (!allowlist.includes(email)) {
			// Log both sides so a mismatch (typo, different address) and a server that
			// never loaded the env are distinguishable in one glance.
			console.error(
				"[dashboard] email ditolak:",
				email,
				"| entri allowlist:",
				allowlist.length,
			);

			return {
				ok: false,
				error:
					allowlist.length === 0
						? "Server belum membaca DASHBOARD_EMAILS. Restart server setelah mengubah .env, lalu coba lagi."
						: `Email ${email} tidak punya akses. Daftar akses berisi ${allowlist.length} email.`,
			};
		}

		setCookie(
			DASHBOARD_COOKIE,
			signDashboardSession({ email, exp: Date.now() + SESSION_TTL_MS }, secret),
			{
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				path: "/",
				maxAge: SESSION_TTL_MS / 1000,
			},
		);

		return { ok: true, email };
	});

export const signOutDashboard = createServerFn({ method: "POST" }).handler(
	async (): Promise<{ ok: true }> => {
		deleteCookie(DASHBOARD_COOKIE, { path: "/" });
		return { ok: true };
	},
);

/**
 * Password login.
 *
 * Shares the same signed cookie as the magic-link path, so everything downstream
 * (guard, allowlist re-check, sign out) is unchanged. Attempts are throttled per
 * IP in memory: enough to stop guessing against a single container.
 */
export const createDashboardPasswordSession = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string }) => ({
		password: String(data?.password ?? ""),
	}))
	.handler(async ({ data }): Promise<CreateResult> => {
		const secret = sessionSecret();
		if (!secret) {
			return {
				ok: false,
				error: "DASHBOARD_SESSION_SECRET belum diset di server.",
			};
		}

		const hash = process.env.DASHBOARD_PASSWORD_HASH;
		if (!hash) {
			return { ok: false, error: "Login password belum diaktifkan di server." };
		}

		const key = clientKey();
		const now = Date.now();
		const limit = checkRateLimit(attempts.get(key), now, LOGIN_LIMIT);
		if (!limit.allowed) {
			const minutes = Math.ceil(limit.retryAfterMs / 60_000);
			return {
				ok: false,
				error: `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`,
			};
		}

		if (!verifyDashboardPassword(data.password, hash)) {
			attempts.set(key, recordAttempt(attempts.get(key), now, LOGIN_WINDOW_MS));
			return { ok: false, error: "Password salah." };
		}

		attempts.delete(key);

		const email = identity();
		setCookie(
			DASHBOARD_COOKIE,
			signDashboardSession({ email, exp: now + SESSION_TTL_MS }, secret),
			{
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				path: "/",
				maxAge: SESSION_TTL_MS / 1000,
			},
		);

		return { ok: true, email };
	});
