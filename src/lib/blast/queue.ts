import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "../dashboard-session-server";
import type { GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { loadAudienceSnapshot } from "./audience-server";
import { planAudience } from "./eligibility";
import { renderTemplate, TEMPLATE_MAX_LENGTH } from "./template";
import { loadTemplateMap } from "./template-server";
import type {
	BlastAudiencePreview,
	BlastBatchView,
	BlastSendStatus,
	BlastSendsPage,
	BlastSendView,
	BlastStatusView,
	QueueBlastResponse,
} from "./types";

/**
 * Antrian blast: pratinjau audiens, pembuatan batch, daftar antrian, batal, dan
 * kirim ulang. Pengiriman sebenarnya dilakukan worker (`worker.ts`).
 */

const QUEUE_CHUNK = 200;
const SEND_PAGE_SIZE = 50;
const MIGRATION_HINT =
	"Tabel antrian blast belum ada. Jalankan supabase/migrations/0009_blast.sql di SQL Editor, lalu coba lagi.";

async function requireDashboardUser(): Promise<void> {
	const user = await readDashboardUser();
	if (!user)
		throw new Error("Sesi dashboard tidak valid. Silakan masuk ulang.");
}

function parseSourceFilter(value: unknown): GuestSource | null {
	return value === "anas" || value === "mila" ? value : null;
}

function parseStatus(value: unknown): BlastSendStatus | null {
	return value === "queued" ||
		value === "sending" ||
		value === "sent" ||
		value === "failed" ||
		value === "skipped" ||
		value === "canceled"
		? value
		: null;
}

function isMissing(error: { code?: string } | null): boolean {
	return error?.code === "PGRST205" || error?.code === "42P01";
}

const audienceInput = (
	data:
		| {
				onlyUnsent?: boolean;
				source?: string;
		  }
		| undefined,
) => ({
	onlyUnsent: Boolean(data?.onlyUnsent),
	source: parseSourceFilter(data?.source),
});

export const getBlastAudience = createServerFn({ method: "GET" })
	.inputValidator(audienceInput)
	.handler(async ({ data }): Promise<BlastAudiencePreview> => {
		await requireDashboardUser();

		const snapshot = await loadAudienceSnapshot();
		const plan = planAudience(snapshot.guests, {
			onlyUnsent: data.onlyUnsent,
			channelFilter: data.source,
			enabledChannels: snapshot.enabledChannels,
			busyGuestIds: snapshot.busyGuestIds,
		});

		return {
			total: plan.eligible.length,
			counts: plan.counts,
			skippedCounts: plan.skippedCounts,
			sampleNames: plan.eligible.slice(0, 8).map((entry) => entry.guest.name),
			channelError: snapshot.error,
		};
	});

export const queueBlast = createServerFn({ method: "POST" })
	.inputValidator(audienceInput)
	.handler(async ({ data }): Promise<QueueBlastResponse> => {
		const user = await readDashboardUser();
		if (!user) {
			throw new Error("Sesi dashboard tidak valid. Silakan masuk ulang.");
		}

		const snapshot = await loadAudienceSnapshot();
		if (snapshot.error) return { ok: false, error: snapshot.error };

		const plan = planAudience(snapshot.guests, {
			onlyUnsent: data.onlyUnsent,
			channelFilter: data.source,
			enabledChannels: snapshot.enabledChannels,
			busyGuestIds: snapshot.busyGuestIds,
		});
		if (!plan.eligible.length) {
			return {
				ok: false,
				error: "Tidak ada tamu yang bisa dikirimi dengan filter ini.",
			};
		}

		const templates = await loadTemplateMap();
		const prepared = plan.eligible.map((entry) => ({
			guestId: entry.guest.id,
			source: entry.channel,
			phone: entry.guest.phone ?? "",
			message: renderTemplate(templates[entry.channel].body, entry.guest),
		}));

		const tooLong = prepared.filter(
			(item) => item.message.length > TEMPLATE_MAX_LENGTH,
		);
		if (tooLong.length) {
			return {
				ok: false,
				error: `${tooLong.length} pesan melebihi ${TEMPLATE_MAX_LENGTH} karakter setelah variabel diisi. Ringkas template dulu.`,
			};
		}

		const supabase = getSupabaseAdmin();
		const { data: batch, error: batchError } = await supabase
			.from("blast_batches")
			.insert({
				source: data.source ?? "all",
				status: "queued",
				total: prepared.length,
				created_by: user.email,
				created_at: new Date().toISOString(),
			})
			.select("id")
			.single();

		if (batchError) {
			return {
				ok: false,
				error: isMissing(batchError) ? MIGRATION_HINT : batchError.message,
			};
		}

		const batchId = (batch as { id: string }).id;
		const rows = prepared.map((item) => ({
			batch_id: batchId,
			guest_id: item.guestId,
			source: item.source,
			phone: item.phone,
			message: item.message,
			ref_id: randomUUID(),
			status: "queued" as const,
			available_at: new Date().toISOString(),
			queued_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}));

		for (let index = 0; index < rows.length; index += QUEUE_CHUNK) {
			const chunk = rows.slice(index, index + QUEUE_CHUNK);
			const { error } = await supabase.from("wa_sends").insert(chunk);
			if (error) {
				await supabase.from("wa_sends").delete().eq("batch_id", batchId);
				await supabase.from("blast_batches").delete().eq("id", batchId);
				return {
					ok: false,
					error:
						error.code === "23505"
							? "Sebagian tamu sudah punya antrian aktif. Muat ulang lalu coba lagi."
							: isMissing(error)
								? MIGRATION_HINT
								: error.message,
				};
			}
		}

		return {
			ok: true,
			batchId,
			total: prepared.length,
			counts: plan.counts,
		};
	});

export const getBlastStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<BlastStatusView> => {
		await requireDashboardUser();
		const supabase = getSupabaseAdmin();

		const [batchResult, queued, sending] = await Promise.all([
			supabase
				.from("blast_batches")
				.select(
					"id, source, status, total, sent, failed, created_at, finished_at",
				)
				.order("created_at", { ascending: false })
				.limit(10),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "queued"),
			supabase
				.from("wa_sends")
				.select("id", { count: "exact", head: true })
				.eq("status", "sending"),
		]);

		if (batchResult.error) {
			return {
				batches: [],
				queued: 0,
				sending: 0,
				error: isMissing(batchResult.error)
					? MIGRATION_HINT
					: batchResult.error.message,
			};
		}

		const batches = (
			(batchResult.data ?? []) as Array<{
				id: string;
				source: string;
				status: string;
				total: number;
				sent: number;
				failed: number;
				created_at: string;
				finished_at: string | null;
			}>
		).map<BlastBatchView>((row) => ({
			id: row.id,
			source:
				row.source === "anas" || row.source === "mila" ? row.source : "all",
			status:
				row.status === "running" ||
				row.status === "completed" ||
				row.status === "canceled"
					? row.status
					: "queued",
			total: row.total,
			sent: row.sent,
			failed: row.failed,
			createdAt: row.created_at,
			finishedAt: row.finished_at,
		}));

		return {
			batches,
			queued: queued.count ?? 0,
			sending: sending.count ?? 0,
			error: null,
		};
	},
);

export const listBlastSends = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data:
				| {
						batchId?: string;
						status?: string;
						query?: string;
						offset?: number;
						limit?: number;
				  }
				| undefined,
		) => ({
			batchId: String(data?.batchId ?? "")
				.trim()
				.slice(0, 64),
			status: parseStatus(data?.status),
			query: String(data?.query ?? "")
				.trim()
				.slice(0, 60),
			offset: Math.max(0, Math.floor(Number(data?.offset) || 0)),
			limit: Math.min(
				200,
				Math.max(1, Math.floor(Number(data?.limit) || SEND_PAGE_SIZE)),
			),
		}),
	)
	.handler(async ({ data }): Promise<BlastSendsPage> => {
		await requireDashboardUser();
		const supabase = getSupabaseAdmin();

		let request = supabase
			.from("wa_sends")
			.select(
				"id, batch_id, source, phone, status, attempts, error, wablas_message_id, queued_at, sent_at, guests(name, slug)",
				{ count: "exact" },
			);

		if (data.batchId) request = request.eq("batch_id", data.batchId);
		if (data.status) request = request.eq("status", data.status);
		if (data.query) {
			const pattern = `%${data.query.replace(/[%_]/g, "")}%`;
			request = request.or(
				`phone.ilike.${pattern},ref_id.ilike.${pattern},error.ilike.${pattern}`,
			);
		}

		const {
			data: rows,
			count,
			error,
		} = await request
			.order("queued_at", { ascending: false })
			.range(data.offset, data.offset + data.limit - 1);

		if (error) {
			return {
				rows: [],
				total: 0,
				error: isMissing(error) ? MIGRATION_HINT : error.message,
			};
		}

		const mapped = (
			(rows ?? []) as Array<{
				id: string;
				batch_id: string | null;
				source: GuestSource;
				phone: string;
				status: string;
				attempts: number;
				error: string | null;
				wablas_message_id: string | null;
				queued_at: string;
				sent_at: string | null;
				guests:
					| { name: string; slug: string }
					| Array<{ name: string; slug: string }>
					| null;
			}>
		).map<BlastSendView>((row) => {
			const guest = Array.isArray(row.guests)
				? (row.guests[0] ?? null)
				: row.guests;
			return {
				id: row.id,
				batchId: row.batch_id,
				guestName: guest?.name ?? "Tamu dihapus",
				guestSlug: guest?.slug ?? null,
				source: row.source,
				phone: row.phone,
				status: parseStatus(row.status) ?? "queued",
				attempts: row.attempts,
				error: row.error,
				wablasMessageId: row.wablas_message_id,
				queuedAt: row.queued_at,
				sentAt: row.sent_at,
			};
		});

		return { rows: mapped, total: count ?? 0, error: null };
	});

export const cancelQueuedSend = createServerFn({ method: "POST" })
	.inputValidator((data: { id?: string }) => ({
		id: String(data?.id ?? "")
			.trim()
			.slice(0, 64),
	}))
	.handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
		await requireDashboardUser();
		if (!data.id) return { ok: false, error: "Pesan tidak dikenal." };

		const supabase = getSupabaseAdmin();
		const { data: row, error } = await supabase
			.from("wa_sends")
			.update({
				status: "canceled",
				updated_at: new Date().toISOString(),
			})
			.eq("id", data.id)
			.eq("status", "queued")
			.select("batch_id")
			.maybeSingle();

		if (error) return { ok: false, error: error.message };
		if (!row) {
			return {
				ok: false,
				error: "Pesan sudah diproses worker dan tidak bisa dibatalkan.",
			};
		}

		const batchId = (row as { batch_id: string | null }).batch_id;
		if (batchId) {
			const { data: batch } = await supabase
				.from("blast_batches")
				.select("total")
				.eq("id", batchId)
				.maybeSingle();
			const total = Number((batch as { total?: number } | null)?.total ?? 1);
			await supabase
				.from("blast_batches")
				.update({ total: Math.max(0, total - 1) })
				.eq("id", batchId);
		}

		return { ok: true };
	});

export const resendFailedSend = createServerFn({ method: "POST" })
	.inputValidator((data: { id?: string }) => ({
		id: String(data?.id ?? "")
			.trim()
			.slice(0, 64),
	}))
	.handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
		await requireDashboardUser();
		if (!data.id) return { ok: false, error: "Pesan tidak dikenal." };

		const supabase = getSupabaseAdmin();
		const { data: source, error } = await supabase
			.from("wa_sends")
			.select("batch_id, guest_id, source, phone, message, status")
			.eq("id", data.id)
			.maybeSingle();

		if (error) return { ok: false, error: error.message };
		const row = source as {
			batch_id: string | null;
			guest_id: string | null;
			source: GuestSource;
			phone: string;
			message: string;
			status: string;
		} | null;

		if (!row) return { ok: false, error: "Pesan tidak ditemukan." };
		if (row.status !== "failed") {
			return { ok: false, error: "Hanya pesan gagal yang bisa dikirim ulang." };
		}

		const now = new Date().toISOString();
		const { error: insertError } = await supabase.from("wa_sends").insert({
			batch_id: row.batch_id,
			guest_id: row.guest_id,
			source: row.source,
			phone: row.phone,
			message: row.message,
			ref_id: randomUUID(),
			status: "queued",
			available_at: now,
			queued_at: now,
			updated_at: now,
		});

		if (insertError) {
			return {
				ok: false,
				error:
					insertError.code === "23505"
						? "Tamu ini masih punya antrian aktif."
						: insertError.message,
			};
		}

		if (row.batch_id) {
			const { data: batch } = await supabase
				.from("blast_batches")
				.select("total")
				.eq("id", row.batch_id)
				.maybeSingle();
			const total = Number((batch as { total?: number } | null)?.total ?? 0);
			await supabase
				.from("blast_batches")
				.update({
					total: total + 1,
					status: "queued",
					finished_at: null,
				})
				.eq("id", row.batch_id);
		}

		return { ok: true };
	});
