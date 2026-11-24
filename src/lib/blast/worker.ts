import { GUEST_SOURCES, type GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { readChannelCredentials } from "./channel-server";
import { TEMPLATE_MAX_LENGTH } from "./template";
import type { WorkerReport } from "./types";
import { sendMessages, WablasError } from "./wablas";

/**
 * Worker antrian blast.
 *
 * Dipanggil oleh `POST /api/blast/worker` (cron sidecar) atau tombol "Proses
 * sekarang" di dashboard. Klaim baris lewat `claim_blast_sends` yang memakai
 * `FOR UPDATE SKIP LOCKED`, jadi dua worker tidak mengirim pesan yang sama.
 *
 * Maksimum 25 pesan per kanal per panggilan, jauh di bawah batas Wablas
 * (50/request, 200 request per menit per kredensial).
 */

const CLAIM_PER_CHANNEL = 25;
const MAX_ATTEMPTS = 3;
const STALE_MS = 10 * 60 * 1000;

interface SendRow {
	id: string;
	ref_id: string;
	batch_id: string | null;
	guest_id: string | null;
	source: GuestSource;
	phone: string;
	message: string;
	attempts: number;
}

function errorMessage(error: unknown): string {
	if (error instanceof WablasError) return error.message;
	if (error instanceof Error && error.message) return error.message;
	return "Gagal mengirim pesan.";
}

function backoffMs(attempts: number): number {
	const minutes = Math.min(9, 3 ** Math.max(0, attempts - 1));
	return minutes * 60_000;
}

async function requeueStaleSends(): Promise<void> {
	const now = new Date().toISOString();
	const cutoff = new Date(Date.now() - STALE_MS).toISOString();
	const supabase = getSupabaseAdmin();

	await supabase
		.from("wa_sends")
		.update({
			status: "queued",
			error: "Worker berhenti sebelum menyelesaikan pesan; dicoba lagi.",
			available_at: now,
			updated_at: now,
		})
		.eq("status", "sending")
		.lt("updated_at", cutoff)
		.lt("attempts", MAX_ATTEMPTS);

	await supabase
		.from("wa_sends")
		.update({
			status: "failed",
			error: "Worker berhenti sebelum menyelesaikan pesan (percobaan habis).",
			updated_at: now,
		})
		.eq("status", "sending")
		.lt("updated_at", cutoff)
		.gte("attempts", MAX_ATTEMPTS);
}

async function claimRows(source: GuestSource): Promise<{
	rows: SendRow[];
	error: string | null;
}> {
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase.rpc("claim_blast_sends", {
		p_limit: CLAIM_PER_CHANNEL,
		p_source: source,
	});

	if (error) {
		return {
			rows: [],
			error:
				error.code === "PGRST202"
					? "Fungsi claim_blast_sends belum ada. Jalankan supabase/migrations/0009_blast.sql."
					: error.message,
		};
	}

	return { rows: (data ?? []) as SendRow[], error: null };
}

async function markFailed(row: SendRow, reason: string): Promise<void> {
	const now = new Date().toISOString();
	await getSupabaseAdmin()
		.from("wa_sends")
		.update({ status: "failed", error: reason.slice(0, 300), updated_at: now })
		.eq("id", row.id);
}

async function markSent(row: SendRow, messageId: string | null): Promise<void> {
	const now = new Date().toISOString();
	const supabase = getSupabaseAdmin();
	await supabase
		.from("wa_sends")
		.update({
			status: "sent",
			wablas_message_id: messageId,
			sent_at: now,
			updated_at: now,
			error: null,
		})
		.eq("id", row.id);

	if (row.guest_id) {
		await supabase
			.from("guests")
			.update({ sent_at: now, updated_at: now })
			.eq("id", row.guest_id)
			.is("sent_at", null);
	}
}

async function requeueRow(row: SendRow, reason: string): Promise<void> {
	const now = Date.now();
	await getSupabaseAdmin()
		.from("wa_sends")
		.update({
			status: "queued",
			error: reason.slice(0, 300),
			available_at: new Date(now + backoffMs(row.attempts)).toISOString(),
			updated_at: new Date(now).toISOString(),
		})
		.eq("id", row.id);
}

async function refreshBatch(batchId: string): Promise<void> {
	const supabase = getSupabaseAdmin();
	const [sent, failed, active] = await Promise.all([
		supabase
			.from("wa_sends")
			.select("id", { count: "exact", head: true })
			.eq("batch_id", batchId)
			.eq("status", "sent"),
		supabase
			.from("wa_sends")
			.select("id", { count: "exact", head: true })
			.eq("batch_id", batchId)
			.eq("status", "failed"),
		supabase
			.from("wa_sends")
			.select("id", { count: "exact", head: true })
			.eq("batch_id", batchId)
			.in("status", ["queued", "sending"]),
	]);

	const remaining = active.count ?? 0;
	const done = remaining === 0;
	const now = new Date().toISOString();
	await supabase
		.from("blast_batches")
		.update({
			sent: sent.count ?? 0,
			failed: failed.count ?? 0,
			status: done ? "completed" : "queued",
			finished_at: done ? now : null,
		})
		.eq("id", batchId);
}

export async function processBlastQueue(): Promise<WorkerReport> {
	const report: WorkerReport = {
		processed: 0,
		sent: 0,
		failed: 0,
		requeued: 0,
		byChannel: { anas: 0, mila: 0 },
		errors: [],
	};

	try {
		await requeueStaleSends();
	} catch (error) {
		report.errors.push(`stale: ${errorMessage(error)}`);
	}

	const affectedBatches = new Set<string>();

	for (const source of GUEST_SOURCES) {
		const claimed = await claimRows(source);
		if (claimed.error) {
			report.errors.push(`${source}: ${claimed.error}`);
			continue;
		}
		if (!claimed.rows.length) continue;

		let rows = claimed.rows;
		report.byChannel[source] += rows.length;
		report.processed += rows.length;
		for (const row of rows) {
			if (row.batch_id) affectedBatches.add(row.batch_id);
		}

		const tooLong = rows.filter(
			(row) => row.message.length > TEMPLATE_MAX_LENGTH,
		);
		for (const row of tooLong) {
			await markFailed(
				row,
				`Pesan ${row.message.length} karakter; maksimal ${TEMPLATE_MAX_LENGTH}.`,
			);
			report.failed += 1;
		}
		rows = rows.filter((row) => row.message.length <= TEMPLATE_MAX_LENGTH);
		if (!rows.length) continue;

		let credentials: Awaited<ReturnType<typeof readChannelCredentials>>;
		try {
			credentials = await readChannelCredentials(source);
		} catch (error) {
			for (const row of rows) {
				await markFailed(row, errorMessage(error));
				report.failed += 1;
			}
			continue;
		}

		if (!credentials || !credentials.enabled) {
			for (const row of rows) {
				await markFailed(
					row,
					credentials
						? "Kanal pengirim dinonaktifkan."
						: "Kredensial kanal belum diisi.",
				);
				report.failed += 1;
			}
			continue;
		}

		try {
			const results = await sendMessages(
				credentials,
				rows.map((row) => ({
					phone: row.phone,
					message: row.message,
					refId: row.ref_id,
				})),
			);
			const byRef = new Map(results.map((result) => [result.refId, result]));

			for (const row of rows) {
				const match = byRef.get(row.ref_id);
				if (match) {
					await markSent(row, match.messageId);
					report.sent += 1;
				} else {
					await markFailed(
						row,
						"Wablas tidak mengembalikan status untuk pesan ini.",
					);
					report.failed += 1;
				}
			}
		} catch (error) {
			const transient =
				error instanceof WablasError && error.kind === "transient";
			const reason = errorMessage(error);

			for (const row of rows) {
				if (transient && row.attempts < MAX_ATTEMPTS) {
					await requeueRow(row, reason);
					report.requeued += 1;
				} else {
					await markFailed(row, reason);
					report.failed += 1;
				}
			}
		}
	}

	for (const batchId of affectedBatches) {
		try {
			await refreshBatch(batchId);
		} catch (error) {
			report.errors.push(`batch ${batchId}: ${errorMessage(error)}`);
		}
	}

	return report;
}
