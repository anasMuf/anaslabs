import type { GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { loadBlastChannelRows } from "./channel-server";
import type { BlastGuestInput } from "./eligibility";

/**
 * Snapshot data yang dibutuhkan untuk menghitung audiens blast: tamu aktif,
 * kanal yang aktif, dan tamu yang sudah punya antrian berjalan.
 */

interface GuestRow {
	id: string;
	name: string;
	slug: string;
	group_name: string | null;
	address: string | null;
	invited: string | null;
	source_sheet: GuestSource;
	delivery: "digital" | "fisik";
	phone: string | null;
	sent_at: string | null;
	archived_at: string | null;
	blast_channel: GuestSource | null;
}

export interface AudienceSnapshot {
	guests: BlastGuestInput[];
	enabledChannels: Record<GuestSource, boolean>;
	busyGuestIds: Set<string>;
	error: string | null;
}

export const EMPTY_AUDIENCE: AudienceSnapshot = {
	guests: [],
	enabledChannels: { anas: false, mila: false },
	busyGuestIds: new Set(),
	error: null,
};

export async function loadAudienceSnapshot(): Promise<AudienceSnapshot> {
	const supabase = getSupabaseAdmin();

	const [guestResult, channelResult, busyResult] = await Promise.all([
		supabase
			.from("guests")
			.select(
				"id, name, slug, group_name, address, invited, source_sheet, delivery, phone, sent_at, archived_at, blast_channel",
			)
			.is("archived_at", null),
		loadBlastChannelRows(),
		supabase
			.from("wa_sends")
			.select("guest_id")
			.in("status", ["queued", "sending"]),
	]);

	if (guestResult.error) {
		return {
			...EMPTY_AUDIENCE,
			error: guestResult.error.message,
		};
	}

	const enabledChannels: Record<GuestSource, boolean> = {
		anas: false,
		mila: false,
	};
	for (const row of channelResult.rows) {
		enabledChannels[row.source] = row.enabled;
	}

	// Tabel antrian bisa belum ada saat migrasi belum dijalankan; perlakukan
	// sebagai "tidak ada yang sibuk" agar pratinjau audiens tetap bisa dibuka.
	const busyGuestIds = new Set<string>();
	if (!busyResult.error) {
		for (const row of busyResult.data ?? []) {
			const id = (row as { guest_id?: string | null }).guest_id;
			if (id) busyGuestIds.add(id);
		}
	}

	return {
		guests: ((guestResult.data ?? []) as GuestRow[]).map((row) => ({
			id: row.id,
			name: row.name,
			slug: row.slug,
			groupName: row.group_name,
			address: row.address,
			invited: row.invited,
			source: row.source_sheet,
			delivery: row.delivery,
			phone: row.phone,
			sentAt: row.sent_at,
			archived: Boolean(row.archived_at),
			blastChannel: row.blast_channel,
		})),
		enabledChannels,
		busyGuestIds,
		error: channelResult.error,
	};
}
