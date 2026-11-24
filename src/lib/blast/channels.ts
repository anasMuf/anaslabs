import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser, sessionSecret } from "../dashboard-session-server";
import {
	GUEST_SOURCE_LABELS,
	type GuestSource,
	normalizeGuestPhone,
} from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import {
	BLAST_CHANNELS_TABLE,
	BLAST_MIGRATION_HINT,
	type BlastChannelRow,
	buildChannelView,
	isMissingRelation,
	listChannelViews,
	loadBlastChannelRow,
	readChannelCredentials,
} from "./channel-server";
import { decryptSecret, encryptSecret } from "./crypto";
import type { BlastChannelResult, BlastChannelsResult } from "./types";
import { fetchDeviceInfo, normalizeBaseUrl, WablasError } from "./wablas";

/**
 * Server functions untuk kanal Wablas.
 *
 * Token dan secret key hanya hidup di server: input dienkripsi sebelum ditulis,
 * dan respons ke browser hanya berisi status + 4 karakter terakhir token.
 * Kredensial baru hanya disimpan setelah `device/info` membuktikan token valid.
 */

async function requireDashboardUser(): Promise<void> {
	const user = await readDashboardUser();
	if (!user)
		throw new Error("Sesi dashboard tidak valid. Silakan masuk ulang.");
}

function parseSource(value: unknown): GuestSource {
	return value === "mila" ? "mila" : "anas";
}

function readableError(error: unknown, fallback: string): string {
	if (error instanceof WablasError) return error.message;
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

function safeExpiry(value: string | null): string | null {
	if (!value) return null;
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export const listBlastChannels = createServerFn({ method: "GET" }).handler(
	async (): Promise<BlastChannelsResult> => {
		await requireDashboardUser();
		return listChannelViews();
	},
);

export const saveBlastChannel = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			source?: string;
			baseUrl?: string;
			token?: string;
			secretKey?: string;
			senderPhone?: string;
		}) => ({
			source: parseSource(data?.source),
			baseUrl: String(data?.baseUrl ?? "")
				.trim()
				.slice(0, 200),
			token: String(data?.token ?? "")
				.trim()
				.slice(0, 400),
			secretKey: String(data?.secretKey ?? "")
				.trim()
				.slice(0, 400),
			senderPhone: String(data?.senderPhone ?? "")
				.trim()
				.slice(0, 30),
		}),
	)
	.handler(async ({ data }): Promise<BlastChannelResult> => {
		await requireDashboardUser();

		const secret = sessionSecret();
		if (!secret) {
			return {
				ok: false,
				error:
					"DASHBOARD_SESSION_SECRET belum diset (minimal 16 karakter), kredensial tidak bisa disimpan.",
			};
		}

		const { row, error } = await loadBlastChannelRow(data.source);
		if (error) return { ok: false, error };

		let baseUrl: string;
		try {
			baseUrl = normalizeBaseUrl(data.baseUrl || row?.base_url);
		} catch (caught) {
			return {
				ok: false,
				error: readableError(caught, "Alamat Wablas tidak valid."),
			};
		}

		let token: string;
		let secretKey: string;
		try {
			token =
				data.token || (row ? decryptSecret(row.token_cipher, secret) : "");
			secretKey =
				data.secretKey || (row ? decryptSecret(row.secret_cipher, secret) : "");
		} catch (caught) {
			return {
				ok: false,
				error: readableError(caught, "Kredensial tidak terbaca."),
			};
		}

		if (!token || !secretKey) {
			return { ok: false, error: "Token dan secret key Wablas wajib diisi." };
		}

		let info: Awaited<ReturnType<typeof fetchDeviceInfo>>;
		try {
			info = await fetchDeviceInfo({ baseUrl, token, secretKey });
		} catch (caught) {
			return {
				ok: false,
				error: `Uji koneksi gagal: ${readableError(caught, "tidak bisa menghubungi Wablas.")}`,
			};
		}

		const senderPhone =
			normalizeGuestPhone(data.senderPhone) ??
			normalizeGuestPhone(info.sender) ??
			null;
		const now = new Date().toISOString();
		const supabase = getSupabaseAdmin();
		const { data: saved, error: saveError } = await supabase
			.from(BLAST_CHANNELS_TABLE)
			.upsert(
				{
					source: data.source,
					label: row?.label ?? GUEST_SOURCE_LABELS[data.source],
					base_url: baseUrl,
					sender_phone: senderPhone,
					device_id: info.deviceId,
					token_cipher: encryptSecret(token, secret),
					secret_cipher: encryptSecret(secretKey, secret),
					enabled: row?.enabled ?? true,
					status: info.status,
					quota: info.quota,
					expires_on: safeExpiry(info.expiresOn),
					last_checked_at: now,
					updated_at: now,
				},
				{ onConflict: "source" },
			)
			.select("*")
			.single();

		if (saveError) {
			return {
				ok: false,
				error: isMissingRelation(saveError)
					? BLAST_MIGRATION_HINT
					: saveError.message,
			};
		}

		return {
			ok: true,
			channel: buildChannelView(data.source, saved as BlastChannelRow, secret),
		};
	});

export const testBlastChannel = createServerFn({ method: "POST" })
	.inputValidator((data: { source?: string }) => ({
		source: parseSource(data?.source),
	}))
	.handler(async ({ data }): Promise<BlastChannelResult> => {
		await requireDashboardUser();

		let credentials: Awaited<ReturnType<typeof readChannelCredentials>>;
		try {
			credentials = await readChannelCredentials(data.source);
		} catch (caught) {
			return {
				ok: false,
				error: readableError(caught, "Kredensial tidak terbaca."),
			};
		}
		if (!credentials) {
			return { ok: false, error: "Kredensial kanal ini belum diisi." };
		}

		let info: Awaited<ReturnType<typeof fetchDeviceInfo>>;
		try {
			info = await fetchDeviceInfo(credentials);
		} catch (caught) {
			return { ok: false, error: readableError(caught, "Uji koneksi gagal.") };
		}

		const secret = sessionSecret();
		const now = new Date().toISOString();
		const supabase = getSupabaseAdmin();
		const { data: saved, error } = await supabase
			.from(BLAST_CHANNELS_TABLE)
			.update({
				status: info.status,
				quota: info.quota,
				expires_on: safeExpiry(info.expiresOn),
				device_id: info.deviceId,
				last_checked_at: now,
				updated_at: now,
			})
			.eq("source", data.source)
			.select("*")
			.single();

		if (error) {
			return {
				ok: false,
				error: isMissingRelation(error) ? BLAST_MIGRATION_HINT : error.message,
			};
		}

		return {
			ok: true,
			channel: buildChannelView(data.source, saved as BlastChannelRow, secret),
		};
	});

export const setBlastChannelEnabled = createServerFn({ method: "POST" })
	.inputValidator((data: { source?: string; enabled?: boolean }) => ({
		source: parseSource(data?.source),
		enabled: Boolean(data?.enabled),
	}))
	.handler(async ({ data }): Promise<BlastChannelResult> => {
		await requireDashboardUser();

		const secret = sessionSecret();
		const supabase = getSupabaseAdmin();
		const { data: saved, error } = await supabase
			.from(BLAST_CHANNELS_TABLE)
			.update({ enabled: data.enabled, updated_at: new Date().toISOString() })
			.eq("source", data.source)
			.select("*")
			.single();

		if (error) {
			return {
				ok: false,
				error: isMissingRelation(error) ? BLAST_MIGRATION_HINT : error.message,
			};
		}

		return {
			ok: true,
			channel: buildChannelView(data.source, saved as BlastChannelRow, secret),
		};
	});
