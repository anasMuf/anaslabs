/**
 * Guest personalisation map: URL slug → the name shown on the cover.
 *
 * Slugs are lowercase, hyphenated and never rendered in the UI, so sharing
 * `/invitation/<slug>` is enough to greet the guest by name.
 */

export interface InvitationGuest {
	name: string;
}

const guests: Record<string, InvitationGuest> = {
	test: { name: "test" },
	"anas-dan-keluarga": { name: "Anas & Keluarga" },
	"mila-dan-keluarga": { name: "Mila & Keluarga" },
	"tamu-undangan": { name: "Tamu Undangan" },
};

/** Returns the guest for a slug, or null when the slug is not invited. */
export function resolveGuest(slug: string): InvitationGuest | null {
	const key = slug.trim().toLowerCase();
	if (!key) return null;
	return guests[key] ?? null;
}
