import { getCookie } from "@tanstack/react-start/server";
import { DASHBOARD_COOKIE, verifyDashboardSession } from "./dashboard-session";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Dashboard session reads, kept in a plain module (no `createServerFn`).
 *
 * The server-function bundler splits every `*.ts` that defines server functions
 * into an RPC-only module, so a helper exported next to them cannot be imported
 * by other server code. Living here lets both `dashboard-auth.ts` and the guest
 * server functions share the same guard.
 */

export interface DashboardUser {
	email: string;
}

export function sessionSecret(): string | null {
	const secret = process.env.DASHBOARD_SESSION_SECRET;
	return secret && secret.length >= 16 ? secret : null;
}

export type AllowCheck = "allowed" | "denied" | "missing";

/**
 * Email must exist in `dashboard_users`; the table is the access list.
 *
 * `missing` is reported separately from `denied` so an un-run migration shows up
 * as a setup problem instead of looking like a rejected account.
 */
export async function checkAllowedEmail(email: string): Promise<AllowCheck> {
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

/** Verifies the cookie and re-checks the access list on every call. */
export async function readDashboardUser(): Promise<DashboardUser | null> {
	const secret = sessionSecret();
	if (!secret) return null;

	const session = verifyDashboardSession(getCookie(DASHBOARD_COOKIE), secret);
	if (!session) return null;

	if ((await checkAllowedEmail(session.email)) !== "allowed") return null;

	return { email: session.email };
}
