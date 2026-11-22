/**
 * Caption shown under the guest's name on the cover.
 *
 * The sheet's `KETERANGAN` (group) is the default. When the group is the
 * catch-all "Lainnya", the address is more useful, so it wins — unless the
 * address is empty, in which case we keep the group so the line is never blank.
 *
 * Computed on the server: the browser only receives this one string, not the
 * raw group/address columns.
 */
const OTHERS = /lainnya/i;

export function guestCoverCaption(
	groupName: string | null | undefined,
	address: string | null | undefined,
): string | null {
	const group = (groupName ?? "").replace(/\s+/g, " ").trim();
	const place = (address ?? "").replace(/\s+/g, " ").trim();

	if (group && OTHERS.test(group)) return place || group;
	return group || place || null;
}
