import { sessionSecret } from "../dashboard-session-server";
import {
	GUEST_SOURCE_LABELS,
	GUEST_SOURCES,
	type GuestSource,
} from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { decryptSecret, maskSecret } from "./crypto";
import type { BlastChannelView } from "./types";
import { DEFAULT_WABLAS_BASE_URL } from "./wablas";

/**
 * Pembacaan kanal di sisi server (tanpa `createServerFn`).
 *
 * Modul ini dipisah dari `channels.ts` karena bundler server function mengubah
 * modul yang punya `createServerFn` menjadi RPC-only; helper biasa di dalamnya
 * tidak bisa diimpor oleh modul server lain (worker, send, template).
 */

export const BLAST_CHANNELS_TABLE = "blast_channels";

export const BLAST_MIGRATION_HINT =
	"Tabel blast_channels belum ada. Jalankan supabase/migrations/0009_blast.sql di SQL Editor, lalu coba lagi.";

export interface BlastChannelRow {
	source: GuestSource;
	label: string;
	base_url: string;
	sender_phone: string | null;
	device_id: string | null;
	token_cipher: string;
	secret_cipher: string;
	enabled: boolean;
	status: string | null;
	quota: number | null;
	expires_on: string | null;
	last_checked_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ChannelCredentials {
	source: GuestSource;
	label: string;
	baseUrl: string;
	token: string;
	secretKey: string;
	enabled: boolean;
}

export function isMissingRelation(error: { code?: string } | null): boolean {
	// PGRST205 = tabel tidak ada di schema cache; 42P01 = relation not exist.
	return error?.code === "PGRST205" || error?.code === "42P01";
}

export function defaultChannelView(source: GuestSource): BlastChannelView {
	return {
		source,
		label: GUEST_SOURCE_LABELS[source],
		baseUrl: DEFAULT_WABLAS_BASE_URL,
		senderPhone: null,
		deviceId: null,
		enabled: false,
		configured: false,
		tokenHint: null,
		needsReentry: false,
		status: null,
		quota: null,
		expiresOn: null,
		lastCheckedAt: null,
	};
}

export function buildChannelView(
	source: GuestSource,
	row: BlastChannelRow | null,
	secret: string | null,
): BlastChannelView {
	if (!row) return defaultChannelView(source);

	let tokenHint: string | null = null;
	let needsReentry = false;
	if (!secret) {
		needsReentry = true;
	} else {
		try {
			tokenHint = maskSecret(decryptSecret(row.token_cipher, secret));
		} catch {
			needsReentry = true;
		}
	}

	return {
		source,
		label: row.label || GUEST_SOURCE_LABELS[source],
		baseUrl: row.base_url || DEFAULT_WABLAS_BASE_URL,
		senderPhone: row.sender_phone,
		deviceId: row.device_id,
		enabled: row.enabled,
		configured: true,
		tokenHint,
		needsReentry,
		status: row.status,
		quota: row.quota,
		expiresOn: row.expires_on,
		lastCheckedAt: row.last_checked_at,
	};
}

export async function loadBlastChannelRows(): Promise<{
	rows: BlastChannelRow[];
	error: string | null;
}> {
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from(BLAST_CHANNELS_TABLE)
		.select("*")
		.order("source", { ascending: true });

	if (error) {
		return {
			rows: [],
			error: isMissingRelation(error) ? BLAST_MIGRATION_HINT : error.message,
		};
	}

	return { rows: (data ?? []) as BlastChannelRow[], error: null };
}

export async function loadBlastChannelRow(source: GuestSource): Promise<{
	row: BlastChannelRow | null;
	error: string | null;
}> {
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from(BLAST_CHANNELS_TABLE)
		.select("*")
		.eq("source", source)
		.maybeSingle();

	if (error) {
		return {
			row: null,
			error: isMissingRelation(error) ? BLAST_MIGRATION_HINT : error.message,
		};
	}

	return { row: (data as BlastChannelRow | null) ?? null, error: null };
}

export async function listChannelViews(): Promise<{
	channels: BlastChannelView[];
	error: string | null;
}> {
	const { rows, error } = await loadBlastChannelRows();
	const secret = sessionSecret();
	const bySource = new Map(rows.map((row) => [row.source, row]));

	return {
		channels: GUEST_SOURCES.map((source) =>
			buildChannelView(source, bySource.get(source) ?? null, secret),
		),
		error,
	};
}

/**
 * Kredensial siap pakai untuk worker/kirim. `null` berarti kanal belum
 * dikonfigurasi. Melempar error yang bisa dibaca bila ciphertext tidak terbaca.
 */
export async function readChannelCredentials(
	source: GuestSource,
): Promise<ChannelCredentials | null> {
	const { row, error } = await loadBlastChannelRow(source);
	if (error) throw new Error(error);
	if (!row) return null;

	const secret = sessionSecret();
	if (!secret) {
		throw new Error(
			"DASHBOARD_SESSION_SECRET belum diset, kredensial Wablas tidak bisa dibaca.",
		);
	}

	return {
		source,
		label: row.label,
		baseUrl: row.base_url,
		token: decryptSecret(row.token_cipher, secret),
		secretKey: decryptSecret(row.secret_cipher, secret),
		enabled: row.enabled,
	};
}
