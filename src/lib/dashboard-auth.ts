import { createServerFn } from "@tanstack/react-start";
import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server";
import {
	DASHBOARD_COOKIE,
	SESSION_TTL_MS,
	signDashboardSession,
	verifyDashboardSession,
} from "./dashboard-session";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Dashboard auth.
 *
 * Credentials live in Supabase Auth (email + password, managed from the Supabase
 * dashboard) and access is gated by the `dashboard_users` table. Nothing about
 * the login is stored in the environment, so a stale process or dotenv
 * interpolation cannot break it.
 */

export interface DashboardUser {
	email: string;
}

export interface DashboardAuthConfigPublic {
	url: string;
	publishableKey: string;
}

export type DashboardLoginMode = "supabase" | "none";

type CreateResult = { ok: true; email: string } | { ok: false; error: string };

type AllowCheck = "allowed" | "denied" | "missing";

function sessionSecret(): string | null {
	const secret = process.env.DASHBOARD_SESSION_SECRET;
	return secret && secret.length >= 16 ? secret : null;
}

/**
 * Email must exist in `dashboard_users`; the table is the access list.
 *
 * `missing` is reported separately from `denied` so an un-run migration shows up
 * as a setup problem instead of looking like a rejected account.
 */
async function checkAllowedEmail(email: string): Promise<AllowCheck> {
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("dashboard_users")
		.select("email")
		.eq("email", email)
		.maybeSingle();

	if (error) {
		if (error.code === "PGRST205") return "missing";
		console.error("[dashboard] gagal membaca dashboard_users:", error.message);
		return "denied";
	}

	return data ? "allowed" : "denied";
}

const MISSING_TABLE_PESAN =
	"Tabel dashboard_users belum ada. Jalankan supabase/migrations/0002_dashboard_users.sql di SQL Editor, lalu coba lagi.";

/** Public Supabase Auth config for the browser; `null` means not configured. */
export const getDashboardAuthConfig = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardAuthConfigPublic | null> => {
		const url = process.env.SUPABASE_URL;
		const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
		if (!url || !publishableKey) return null;

		return { url, publishableKey };
	},
);

export const getDashboardLoginMode = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ mode: DashboardLoginMode }> => {
		const configured = Boolean(
			process.env.SUPABASE_URL &&
				process.env.SUPABASE_PUBLISHABLE_KEY &&
				process.env.SUPABASE_SECRET_KEY &&
				sessionSecret(),
		);

		return { mode: configured ? "supabase" : "none" };
	},
);

export const getDashboardUser = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardUser | null> => {
		const secret = sessionSecret();
		if (!secret) return null;

		const session = verifyDashboardSession(getCookie(DASHBOARD_COOKIE), secret);
		if (!session) return null;

		// Re-check the access list on every read so removing a row revokes access.
		if ((await checkAllowedEmail(session.email)) !== "allowed") return null;

		return { email: session.email };
	},
);

/**
 * Exchanges a Supabase Auth access token (obtained by `signInWithPassword` in the
 * browser) for our own signed httpOnly cookie.
 */
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
		const allowed = await checkAllowedEmail(email);
		if (allowed === "missing") {
			return { ok: false, error: MISSING_TABLE_PESAN };
		}
		if (allowed !== "allowed") {
			return {
				ok: false,
				error: `Email ${email} tidak terdaftar di dashboard_users.`,
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
