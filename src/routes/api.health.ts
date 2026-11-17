import { createFileRoute } from "@tanstack/react-router";
import { fingerprintDashboardHash } from "#/lib/dashboard-password";
import { parseDashboardAllowlist } from "#/lib/dashboard-session";

/**
 * Non-secret health probe.
 *
 * Reports *whether* each setting is present, never the value, so it is safe to
 * expose. Handy for two things: checking that a running server actually picked
 * up `.env` (they are read once at boot), and monitoring after deploy.
 */
export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: () => {
				const body = {
					ok: true,
					env: {
						supabaseUrl: Boolean(process.env.SUPABASE_URL),
						supabaseSecret: Boolean(process.env.SUPABASE_SECRET_KEY),
						supabasePublishable: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
						sessionSecret: Boolean(process.env.DASHBOARD_SESSION_SECRET),
						passwordMode: Boolean(process.env.DASHBOARD_PASSWORD_HASH),
						// Length and fingerprint together expose a stale process or a mangled
						// value without revealing the hash itself.
						passwordHashLength:
							process.env.DASHBOARD_PASSWORD_HASH?.length ?? 0,
						passwordHashFingerprint: fingerprintDashboardHash(
							process.env.DASHBOARD_PASSWORD_HASH,
						),
						allowlistCount: parseDashboardAllowlist(
							process.env.DASHBOARD_EMAILS,
						).length,
					},
				};

				return new Response(JSON.stringify(body), {
					headers: {
						"content-type": "application/json",
						"cache-control": "no-store",
					},
				});
			},
		},
	},
});
