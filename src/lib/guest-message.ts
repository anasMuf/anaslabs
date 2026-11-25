import { effectiveBlastChannel } from "./blast/attribution";
import { renderTemplate } from "./blast/template";
import type { GuestSource } from "./guest-import";

/**
 * Full blast message for one guest, rendered from the template that the blast
 * worker would actually use.
 *
 * The channel follows `effectiveBlastChannel` (per-guest override, else the
 * sheet of origin) so "Salin pesan" in the guest list produces the same text as
 * a real send. Unlike the Wablas `send-link` payload, the URL stays inside the
 * text because this is meant to be pasted manually into WhatsApp.
 */

export type TemplateBodies = Record<GuestSource, string>;

export interface GuestMessageSource {
	name: string;
	groupName: string | null;
	address: string | null;
	invited: string | null;
	slug: string;
	source: GuestSource;
	/** Override nomor pengirim; `null` berarti ikut `source`. */
	blastChannel: GuestSource | null;
}

/** Template key for this guest (override → source). */
export function guestMessageChannel(
	guest: Pick<GuestMessageSource, "source" | "blastChannel">,
): GuestSource {
	return effectiveBlastChannel(guest);
}

export function renderGuestMessage(
	guest: GuestMessageSource,
	bodies: TemplateBodies,
): string {
	const channel = guestMessageChannel(guest);
	return renderTemplate(bodies[channel], {
		name: guest.name,
		groupName: guest.groupName,
		address: guest.address,
		invited: guest.invited,
		slug: guest.slug,
	});
}
