import { resolveGuest } from "#/data/invitation-guests";
import type { GuestSide } from "./invitation-personalization";
import { getSupabaseAdmin } from "./supabase-admin";

export interface ResolvedGuest {
	name: string;
	/**
	 * Which side invited the guest. Derived from `source_sheet` (anas = groom,
	 * mila = bride). This is safe to send to the browser; phone and group are not.
	 */
	side: GuestSide | null;
}

/** `source_sheet` is the only side marker the sheet import provides. */
function sideFromSource(source: string | null | undefined): GuestSide | null {
	if (source === "anas") return "groom";
	if (source === "mila") return "bride";
	return null;
}

/**
 * Slug → display name (+ side), for the invitation page and the wall.
 *
 * Plain module (no server functions) so both `lib/guest.ts` and `lib/wall.ts`
 * can use it: the server-function bundler only lets a module expose server
 * functions to other modules.
 *
 * The `guests` table wins; the hand-written map stays as a fallback so
 * `/invitation/test` and the original slugs keep working, and so the site still
 * renders before migration 0003 is applied. Fallback slugs have no side, so
 * they keep the default copy.
 */
export async function findGuest(slug: string): Promise<ResolvedGuest | null> {
	const key = slug.trim().toLowerCase();
	if (!key) return null;

	try {
		const supabase = getSupabaseAdmin();
		const { data } = await supabase
			.from("guests")
			.select("name, source_sheet")
			.eq("slug", key)
			.maybeSingle();

		if (data?.name) {
			return { name: data.name, side: sideFromSource(data.source_sheet) };
		}
	} catch {
		// Fall through to the local map.
	}

	const fallback = resolveGuest(key);
	return fallback ? { name: fallback.name, side: null } : null;
}
