import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "../dashboard-session-server";
import {
	MUSIC_BUCKET,
	ogObjectPath,
	validateOgUpload,
} from "../invitation-upload";
import { createTtlCache } from "../server-cache";
import { getSupabaseAdmin } from "../supabase-admin";
import {
	EMPTY_META,
	type InvitationMeta,
	isMissingMeta,
	loadInvitationMeta,
	META_MIGRATION_HINT,
} from "./meta-server";

/**
 * Metadata Open Graph global (satu undangan).
 *
 * Pembacaan bersifat publik karena dipakai `head()` halaman undangan. Bila
 * migrasi belum dijalankan, pembacaan mengembalikan `null` (fallback default),
 * bukan error, supaya halaman tamu tidak ikut rusak.
 */

const TABLE = "invitation_meta";
const MIGRATION_HINT = META_MIGRATION_HINT;

export type InvitationMetaView = InvitationMeta;

export interface InvitationMetaResult {
	ok: true;
	meta: InvitationMetaView;
}

export type InvitationMetaMutation =
	| InvitationMetaResult
	| { ok: false; error: string };

export interface OgUploadTarget {
	ok: true;
	path: string;
	token: string;
	publicUrl: string;
}

export type OgUploadResult = OgUploadTarget | { ok: false; error: string };

function cleanText(value: unknown, max: number): string | null {
	const text = String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, max);
	return text || null;
}

function errorMessage(error: unknown): string {
	return error instanceof Error && error.message
		? error.message
		: "Terjadi kesalahan yang tidak diketahui.";
}

async function loadMeta(): Promise<{
	meta: InvitationMetaView;
	error: string | null;
}> {
	return loadInvitationMeta();
}

/** Read on every invitation request; cleared whenever the dashboard writes. */
const metaCache = createTtlCache<InvitationMetaView>(60_000);

export const getInvitationMeta = createServerFn({ method: "GET" }).handler(
	async (): Promise<InvitationMetaView> => {
		try {
			return await metaCache.read(async () => {
				const { meta, error } = await loadMeta();
				// Do not cache a failed read; the next request should retry.
				if (error) throw new Error(error);
				return meta;
			});
		} catch (error) {
			console.error(
				"[invitation-meta] gagal membaca metadata, memakai default:",
				errorMessage(error),
			);
			return EMPTY_META;
		}
	},
);

export const getInvitationMetaForDashboard = createServerFn({
	method: "GET",
}).handler(async (): Promise<InvitationMetaMutation> => {
	const user = await readDashboardUser();
	if (!user) {
		return {
			ok: false,
			error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
		};
	}

	const { meta, error } = await loadMeta();
	if (error) return { ok: false, error };
	return { ok: true, meta };
});

export const saveInvitationMeta = createServerFn({ method: "POST" })
	.inputValidator((data: { title?: string; description?: string }) => ({
		title: cleanText(data?.title, 120),
		description: cleanText(data?.description, 300),
	}))
	.handler(async ({ data }): Promise<InvitationMetaMutation> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
			};
		}

		try {
			const supabase = getSupabaseAdmin();
			const { error } = await supabase.from(TABLE).upsert(
				{
					id: "default",
					og_title: data.title,
					og_description: data.description,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "id" },
			);

			if (error) {
				return {
					ok: false,
					error: isMissingMeta(error) ? MIGRATION_HINT : error.message,
				};
			}

			metaCache.clear();
			const { meta } = await loadMeta();
			return { ok: true, meta };
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}
	});

export const saveOgImage = createServerFn({ method: "POST" })
	.inputValidator((data: { imageUrl?: string | null }) => ({
		imageUrl: data?.imageUrl ? String(data.imageUrl).slice(0, 500) : null,
	}))
	.handler(async ({ data }): Promise<InvitationMetaMutation> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
			};
		}

		try {
			const supabase = getSupabaseAdmin();
			const { error } = await supabase.from(TABLE).upsert(
				{
					id: "default",
					og_image_url: data.imageUrl,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "id" },
			);

			if (error) {
				return {
					ok: false,
					error: isMissingMeta(error) ? MIGRATION_HINT : error.message,
				};
			}

			metaCache.clear();
			const { meta } = await loadMeta();
			return { ok: true, meta };
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}
	});

/**
 * Menyegarkan cache preview WhatsApp dengan mengubah `updated_at`. Semua link
 * blast baru akan memakai `?v=<timestamp>` sehingga crawler mengambil ulang.
 */
export const bumpOgVersion = createServerFn({ method: "POST" }).handler(
	async (): Promise<InvitationMetaMutation> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
			};
		}

		try {
			const supabase = getSupabaseAdmin();
			const { error } = await supabase
				.from(TABLE)
				.upsert(
					{ id: "default", updated_at: new Date().toISOString() },
					{ onConflict: "id" },
				);

			if (error) {
				return {
					ok: false,
					error: isMissingMeta(error) ? MIGRATION_HINT : error.message,
				};
			}

			metaCache.clear();
			const { meta } = await loadMeta();
			return { ok: true, meta };
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}
	},
);

export const createOgUploadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: { mime?: string; size?: number } | undefined) => ({
		mime: String(data?.mime ?? ""),
		size: Number(data?.size ?? 0),
	}))
	.handler(async ({ data }): Promise<OgUploadResult> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
			};
		}

		const validation = validateOgUpload({ mime: data.mime, size: data.size });
		if (!validation.ok) return validation;

		try {
			const supabase = getSupabaseAdmin();
			const path = ogObjectPath(validation.ext, crypto.randomUUID());
			const { data: signed, error } = await supabase.storage
				.from(MUSIC_BUCKET)
				.createSignedUploadUrl(path);

			if (error) {
				return {
					ok: false,
					error: /bucket|does not exist/i.test(error.message)
						? "Bucket invitation-media belum ada. Jalankan supabase/migrations/0006_invitation_media.sql."
						: error.message,
				};
			}

			const { data: urlData } = supabase.storage
				.from(MUSIC_BUCKET)
				.getPublicUrl(path);

			return {
				ok: true,
				path: signed.path,
				token: signed.token,
				publicUrl: urlData.publicUrl,
			};
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}
	});
