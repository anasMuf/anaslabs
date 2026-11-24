import { createFileRoute } from "@tanstack/react-router";

/**
 * Non-secret health probe.
 *
 * Reports *whether* each setting is present, never the value, so it is safe to
 * expose. Handy for two things: checking that a running server actually picked
 * up `.env` (they are read once at boot), and monitoring after deploy.
 *
 * Login credentials are not env-based: they live in Supabase Auth, gated by the
 * `dashboard_users` table, so there is nothing else to report here.
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
						blastWorker: Boolean(process.env.BLAST_WORKER_TOKEN),
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
