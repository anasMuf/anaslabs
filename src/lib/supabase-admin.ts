import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for server-side use only.
 *
 * It authenticates with `SUPABASE_SECRET_KEY`, which bypasses row level
 * security, so this module must never be imported from a component or any
 * other client module — only from `createServerFn` handlers. The key is read
 * from `process.env` (no `VITE_` prefix), so Vite never inlines it into the
 * browser bundle.
 */

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
	if (client) return client;

	const url = process.env.SUPABASE_URL;
	const secretKey = process.env.SUPABASE_SECRET_KEY;

	if (!url || !secretKey) {
		throw new Error(
			"SUPABASE_URL dan SUPABASE_SECRET_KEY harus diset di environment server (lihat .env.example).",
		);
	}

	client = createClient(url, secretKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	return client;
}
