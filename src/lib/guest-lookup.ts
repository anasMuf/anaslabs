import { resolveGuest } from "#/data/invitation-guests";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Slug → display name, for the invitation page and the wall.
 *
 * Plain module (no server functions) so both `lib/guest.ts` and `lib/wall.ts`
 * can use it: the server-function bundler only lets a module expose server
 * functions to other modules.
 *
 * The `guests` table wins; the hand-written map stays as a fallback so
 * `/invitation/test` and the original slugs keep working, and so the site still
 * renders before migration 0003 is applied.
 */
export async function findGuestName(slug: string): Promise<string | null> {
	const key = slug.trim().toLowerCase();
	if (!key) return null;

	try {
		const supabase = getSupabaseAdmin();
		const { data } = await supabase
			.from("guests")
			.select("name")
			.eq("slug", key)
			.maybeSingle();

		if (data?.name) return data.name;
	} catch {
		// Fall through to the local map.
	}

	return resolveGuest(key)?.name ?? null;
}
