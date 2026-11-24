import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "../dashboard-session-server";
import type { GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";

/**
 * Reset data uji blast.
 *
 * Yang boleh dihapus hanya riwayat/antrian dan status turunan; baris tamu,
 * slug, kanal, template, dan metadata OG tidak pernah disentuh. Setiap aksi
 * wajib mengetik `RESET` agar tidak terpicu tanpa sengaja.
 */

const CONFIRM_WORD = "RESET";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export interface BlastResetSummary {
	sends: {
		total: number;
		queued: number;
		sending: number;
		sent: number;
		failed: number;
		canceled: number;
	};
	batches: number;
	guestsSent: number;
	guestsOpened: number;
	error: string | null;
}

export type BlastResetResult =
	| {
			ok: true;
			deletedSends: number;
			deletedBatches: number;
			resetSent: number;
			resetOpened: number;
	  }
	| { ok: false; error: string };

type ChannelScope = GuestSource | "all";
type ResetTarget = "sent" | "opened" | "both";

async function requireDashboardUser(): Promise<void> {
	const user = await readDashboardUser();
	if (!user)
		throw new Error("Sesi dashboard tidak valid. Silakan masuk ulang.");
}

function parseChannel(value: unknown): ChannelScope {
	return value === "anas" || value === "mila" ? value : "all";
}

function parseTarget(value: unknown): ResetTarget {
	return value === "sent" || value === "opened" ? value : "both";
}

function confirmed(value: unknown): boolean {
	return (
		String(value ?? "")
			.trim()
			.toUpperCase() === CONFIRM_WORD
	);
}

function firstError(
	results: Array<{ error: { message: string } | null }>,
): string | null {
	const failed = results.find((result) => result.error);
	return failed?.error?.message ?? null;
}

export const getBlastResetSummary = createServerFn({ method: "GET" }).handler(
	async (): Promise<BlastResetSummary> => {
		await requireDashboardUser();
		const supabase = getSupabaseAdmin();
		const guestBase = () =>
			supabase
				.from("guests")
				.select("id", { count: "exact", head: true })
				.is("archived_at", null);

		const [
			total,
			queued,
			sending,
			sent,
			failed,
			canceled,
			batches,
			guestsSent,
			guestsOpened,
		] = await Promise.all([
			supabase.from("wa_sends").select("id", { count: "exact", head: true }),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "queued"),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "sending"),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "sent"),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "failed"),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "canceled"),
			supabase
				.from("blast_batches")
				.select("id", { count: "exact", head: true }),
			guestBase().not("sent_at", "is", null),
			guestBase().not("invitation_opened_at", "is", null),
		]);

		const error = firstError([
			total,
			queued,
			sending,
			sent,
			failed,
			canceled,
			batches,
			guestsSent,
			guestsOpened,
		]);

		return {
			sends: {
				total: total.count ?? 0,
				queued: queued.count ?? 0,
				sending: sending.count ?? 0,
				sent: sent.count ?? 0,
				failed: failed.count ?? 0,
				canceled: canceled.count ?? 0,
			},
			batches: batches.count ?? 0,
			guestsSent: guestsSent.count ?? 0,
			guestsOpened: guestsOpened.count ?? 0,
			error,
		};
	},
);

async function countGuests(
	field: "sent_at" | "invitation_opened_at",
	channel: ChannelScope,
): Promise<number> {
	const supabase = getSupabaseAdmin();

	if (channel === "all") {
		const { count } = await supabase
			.from("guests")
			.select("id", { count: "exact", head: true })
			.is("archived_at", null)
			.not(field, "is", null);
		return count ?? 0;
	}

	const [moved, inherited] = await Promise.all([
		supabase
			.from("guests")
			.select("id", { count: "exact", head: true })
			.is("archived_at", null)
			.not(field, "is", null)
			.eq("blast_channel", channel),
		supabase
			.from("guests")
			.select("id", { count: "exact", head: true })
			.is("archived_at", null)
			.not(field, "is", null)
			.is("blast_channel", null)
			.eq("source_sheet", channel),
	]);

	return (moved.count ?? 0) + (inherited.count ?? 0);
}

async function resetGuestField(
	field: "sent_at" | "invitation_opened_at",
	channel: ChannelScope,
): Promise<void> {
	const supabase = getSupabaseAdmin();
	const now = new Date().toISOString();
	const patch =
		field === "sent_at"
			? { sent_at: null, updated_at: now }
			: { invitation_opened_at: null, updated_at: now };

	if (channel === "all") {
		await supabase
			.from("guests")
			.update(patch)
			.is("archived_at", null)
			.not(field, "is", null);
		return;
	}

	await supabase
		.from("guests")
		.update(patch)
		.is("archived_at", null)
		.not(field, "is", null)
		.eq("blast_channel", channel);

	await supabase
		.from("guests")
		.update(patch)
		.is("archived_at", null)
		.not(field, "is", null)
		.is("blast_channel", null)
		.eq("source_sheet", channel);
}

export const resetGuestStatuses = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { target?: string; channel?: string; confirm?: string }) => ({
			target: parseTarget(data?.target),
			channel: parseChannel(data?.channel),
			confirm: String(data?.confirm ?? ""),
		}),
	)
	.handler(async ({ data }): Promise<BlastResetResult> => {
		await requireDashboardUser();
		if (!confirmed(data.confirm)) {
			return { ok: false, error: "Ketik RESET untuk mengonfirmasi." };
		}

		const resetSent = data.target !== "opened";
		const resetOpened = data.target !== "sent";
		const sentCount = resetSent
			? await countGuests("sent_at", data.channel)
			: 0;
		const openedCount = resetOpened
			? await countGuests("invitation_opened_at", data.channel)
			: 0;

		if (resetSent) await resetGuestField("sent_at", data.channel);
		if (resetOpened)
			await resetGuestField("invitation_opened_at", data.channel);

		return {
			ok: true,
			deletedSends: 0,
			deletedBatches: 0,
			resetSent: sentCount,
			resetOpened: openedCount,
		};
	});

export const resetBlastHistory = createServerFn({ method: "POST" })
	.inputValidator((data: { confirm?: string }) => ({
		confirm: String(data?.confirm ?? ""),
	}))
	.handler(async ({ data }): Promise<BlastResetResult> => {
		await requireDashboardUser();
		if (!confirmed(data.confirm)) {
			return { ok: false, error: "Ketik RESET untuk mengonfirmasi." };
		}

		const supabase = getSupabaseAdmin();
		const [sends, batches] = await Promise.all([
			supabase.from("wa_sends").select("id", { count: "exact", head: true }),
			supabase
				.from("blast_batches")
				.select("id", { count: "exact", head: true }),
		]);

		// Hentikan antrian yang belum diproses sebelum baris dihapus. Pesan yang
		// sudah telanjur dikirim worker bisa tetap sampai ke Wablas.
		await supabase
			.from("wa_sends")
			.update({ status: "canceled", updated_at: new Date().toISOString() })
			.in("status", ["queued", "sending"]);

		const deleteSends = await supabase
			.from("wa_sends")
			.delete()
			.neq("id", ZERO_UUID);
		if (deleteSends.error) {
			return { ok: false, error: deleteSends.error.message };
		}

		const deleteBatches = await supabase
			.from("blast_batches")
			.delete()
			.neq("id", ZERO_UUID);
		if (deleteBatches.error) {
			return { ok: false, error: deleteBatches.error.message };
		}

		return {
			ok: true,
			deletedSends: sends.count ?? 0,
			deletedBatches: batches.count ?? 0,
			resetSent: 0,
			resetOpened: 0,
		};
	});
