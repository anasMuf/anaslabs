import { createServerFn } from "@tanstack/react-start";
import type { InvitationGuest } from "#/data/invitation-guests";
import { findGuestName } from "./guest-lookup";

/**
 * Server-side guest lookup for `/invitation/:slug`.
 *
 * The name comes from the `guests` table (imported from Google Sheets); the
 * hand-written slugs in `data/invitation-guests.ts` remain as a fallback so
 * `/invitation/test` and the original links keep working.
 *
 * Only the display name crosses to the browser: the table also holds phones and
 * groups, which must never be exposed on a name-only, guessable URL.
 */
export const getGuest = createServerFn({ method: "GET" })
	.inputValidator((slug: string) =>
		String(slug ?? "")
			.trim()
			.toLowerCase()
			.slice(0, 80),
	)
	.handler(async ({ data: slug }): Promise<InvitationGuest | null> => {
		const name = await findGuestName(slug);
		return name ? { name } : null;
	});
