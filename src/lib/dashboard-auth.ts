import { createServerFn } from "@tanstack/react-start";
import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server";
import {
	DASHBOARD_COOKIE,
	isAllowedDashboardEmail,
	SESSION_TTL_MS,
	signDashboardSession,
	verifyDashboardSession,
} from "./dashboard-session";

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
		if (!isAllowedDashboardEmail(email, process.env.DASHBOARD_EMAILS)) {
			return {
				ok: false,
				error: "Email ini tidak punya akses ke dashboard.",
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
