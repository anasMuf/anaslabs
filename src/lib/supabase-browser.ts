import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client for Supabase Auth.
 *
 * The URL and publishable key are fetched from the server at runtime instead of
 * being inlined with `VITE_` variables during the build: the Docker image is
 * built in CI, which has no `.env`, so build-time values would silently be
 * empty in production. The publishable key is public by design and cannot
 * bypass row level security, so serving it to the dashboard is safe.
 */

let cached: { key: string; client: SupabaseClient } | null = null;

export interface DashboardAuthConfig {
	url: string;
	publishableKey: string;
}

export function createSupabaseBrowser(
	config: DashboardAuthConfig,
): SupabaseClient {
	const cacheKey = `${config.url}|${config.publishableKey}`;
	if (cached?.key === cacheKey) return cached.client;

	const client = createClient(config.url, config.publishableKey, {
		auth: { persistSession: true, autoRefreshToken: true },
	});
	cached = { key: cacheKey, client };

	return client;
}
