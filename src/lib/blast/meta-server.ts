import { getSupabaseAdmin } from "../supabase-admin";

/**
 * Pembacaan metadata OG di sisi server (tanpa `createServerFn`), dipakai oleh
 * halaman undangan, dashboard, template, dan pembuat link blast.
 */

export interface InvitationMeta {
	title: string | null;
	description: string | null;
	imageUrl: string | null;
	/** Dipakai sebagai versi link agar cache preview WhatsApp ikut berubah. */
	updatedAt: string | null;
}

export const EMPTY_META: InvitationMeta = {
	title: null,
	description: null,
	imageUrl: null,
	updatedAt: null,
};

const TABLE = "invitation_meta";

export const META_MIGRATION_HINT =
	"Tabel invitation_meta belum ada. Jalankan supabase/migrations/0009_blast.sql di SQL Editor, lalu coba lagi.";

export function isMissingMeta(error: { code?: string } | null): boolean {
	return error?.code === "PGRST205" || error?.code === "42P01";
}

export async function loadInvitationMeta(): Promise<{
	meta: InvitationMeta;
	error: string | null;
}> {
	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from(TABLE)
			.select("og_title, og_description, og_image_url, updated_at")
			.eq("id", "default")
			.maybeSingle();

		if (error) {
			return {
				meta: EMPTY_META,
				error: isMissingMeta(error) ? META_MIGRATION_HINT : error.message,
			};
		}

		const row = data as {
			og_title: string | null;
			og_description: string | null;
			og_image_url: string | null;
			updated_at: string | null;
		} | null;

		return {
			meta: {
				title: row?.og_title ?? null,
				description: row?.og_description ?? null,
				imageUrl: row?.og_image_url ?? null,
				updatedAt: row?.updated_at ?? null,
			},
			error: null,
		};
	} catch (error) {
		return {
			meta: EMPTY_META,
			error:
				error instanceof Error && error.message
					? error.message
					: "Gagal membaca metadata OG.",
		};
	}
}
