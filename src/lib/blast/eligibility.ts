import type { GuestSource } from "../guest-import";
import { effectiveBlastChannel } from "./attribution";

/**
 * Aturan siapa yang boleh masuk antrian blast. Murni agar bisa diuji dan
 * dipakai baik oleh pratinjau audiens maupun pembuatan antrian.
 */

export type BlastSkipReason =
	| "arsip"
	| "fisik"
	| "tanpa-nomor"
	| "sedang-antre"
	| "sudah-terkirim"
	| "kanal-nonaktif";

export interface BlastGuestInput {
	id: string;
	name: string;
	slug: string;
	groupName: string | null;
	address: string | null;
	invited: string | null;
	source: GuestSource;
	delivery: "digital" | "fisik";
	phone: string | null;
	sentAt: string | null;
	archived: boolean;
	blastChannel: GuestSource | null;
}

export interface AudienceOptions {
	onlyUnsent?: boolean;
	channelFilter?: GuestSource | null;
	enabledChannels?: Partial<Record<GuestSource, boolean>>;
	/** Tamu yang sudah punya baris `queued`/`sending`. */
	busyGuestIds?: ReadonlySet<string>;
}

export interface AudiencePlan {
	eligible: Array<{ guest: BlastGuestInput; channel: GuestSource }>;
	skipped: Array<{ guest: BlastGuestInput; reason: BlastSkipReason }>;
	counts: Record<GuestSource, number>;
	skippedCounts: Record<BlastSkipReason, number>;
}

const EMPTY_COUNTS = (): Record<GuestSource, number> => ({ anas: 0, mila: 0 });

const EMPTY_SKIPS = (): Record<BlastSkipReason, number> => ({
	arsip: 0,
	fisik: 0,
	"tanpa-nomor": 0,
	"sedang-antre": 0,
	"sudah-terkirim": 0,
	"kanal-nonaktif": 0,
});

export function planAudience(
	guests: BlastGuestInput[],
	options: AudienceOptions = {},
): AudiencePlan {
	const eligible: AudiencePlan["eligible"] = [];
	const skipped: AudiencePlan["skipped"] = [];
	const counts = EMPTY_COUNTS();
	const skippedCounts = EMPTY_SKIPS();
	const busy = options.busyGuestIds ?? new Set<string>();
	const enabled = options.enabledChannels ?? {};

	for (const guest of guests) {
		if (options.channelFilter) {
			const channel = effectiveBlastChannel(guest);
			if (channel !== options.channelFilter) continue;
		}

		let reason: BlastSkipReason | null = null;
		if (guest.archived) reason = "arsip";
		else if (guest.delivery !== "digital") reason = "fisik";
		else if (!guest.phone) reason = "tanpa-nomor";
		else if (busy.has(guest.id)) reason = "sedang-antre";
		else if (options.onlyUnsent && guest.sentAt) reason = "sudah-terkirim";
		else {
			const channel = effectiveBlastChannel(guest);
			if (enabled[channel] === false) reason = "kanal-nonaktif";
		}

		if (reason) {
			skipped.push({ guest, reason });
			skippedCounts[reason] += 1;
			continue;
		}

		const channel = effectiveBlastChannel(guest);
		eligible.push({ guest, channel });
		counts[channel] += 1;
	}

	return { eligible, skipped, counts, skippedCounts };
}
