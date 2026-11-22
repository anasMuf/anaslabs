import { createServerFn } from "@tanstack/react-start";
import { findGuest } from "./guest-lookup";
import type { GuestSide } from "./invitation-personalization";

/**
 * Server-side guest lookup for `/invitation/:slug`.
 *
 * The name comes from the `guests` table (imported from Google Sheets); the
 * hand-written slugs in `data/invitation-guests.ts` remain as a fallback so
 * `/invitation/test` and the original links keep working.
 *
 * Only the display name and the guest's side cross to the browser: the table
 * also holds phones and groups, which must never be exposed on a name-only,
 * guessable URL.
 */
export interface InvitationGuestView {
	name: string;
	/** Group/address line under the name on the cover (already resolved). */
	caption: string | null;
	side: GuestSide | null;
}

export const getGuest = createServerFn({ method: "GET" })
	.inputValidator((slug: string) =>
		String(slug ?? "")
			.trim()
			.toLowerCase()
			.slice(0, 80),
	)
	.handler(async ({ data: slug }): Promise<InvitationGuestView | null> => {
		return findGuest(slug);
	});
