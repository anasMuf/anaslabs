import type { GuestSource } from "../guest-import";

export interface BlastAttributableGuest {
	source: GuestSource;
	/** Override dari dashboard; `null` berarti ikut sheet asal. */
	blastChannel: GuestSource | null;
}

/**
 * Nomor pengirim efektif: override per tamu, jika tidak ada ikut sumber sheet.
 *
 * Dipisah sebagai fungsi murni supaya aturan ini bisa diuji dan dipakai baik
 * oleh daftar tamu maupun antrian blast.
 */
export function effectiveBlastChannel(
	guest: BlastAttributableGuest,
): GuestSource {
	return guest.blastChannel ?? guest.source;
}

export function parseBlastChannel(value: unknown): GuestSource | null {
	return value === "anas" || value === "mila" ? value : null;
}
