import { createServerFn } from "@tanstack/react-start";
import { type InvitationGuest, resolveGuest } from "#/data/invitation-guests";

/**
 * Server-side guest lookup: the slug → name map stays on the server, so the
 * client bundle never contains the full guest list.
 */
export const getGuest = createServerFn({ method: "GET" })
	.inputValidator((slug: string) => slug)
	.handler(
		async ({ data: slug }): Promise<InvitationGuest | null> =>
			resolveGuest(slug),
	);
