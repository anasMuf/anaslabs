import { SITE_URL } from "../site";
import { DEFAULT_COUPLE_NAME } from "./template";

/** Data kartu preview yang ditampilkan di pratinjau pesan dashboard. */
export interface LinkPreviewInfo {
	title: string;
	description: string;
	imageUrl: string;
	host: string;
}

export interface InvitationMetaLike {
	title: string | null;
	description: string | null;
	imageUrl: string | null;
}

/**
 * Padanan visual dari kartu OG yang akan dibuat WhatsApp untuk tautan
 * undangan. Nilai kosong memakai default yang sama dengan `head()` undangan.
 */
export function buildLinkPreview(meta: InvitationMetaLike): LinkPreviewInfo {
	let host = "anaslabs.my.id";
	try {
		host = new URL(SITE_URL).host;
	} catch {
		// SITE_URL selalu valid; fallback ini hanya jaring pengaman.
	}

	return {
		title: meta.title?.trim() || `Undangan Pernikahan ${DEFAULT_COUPLE_NAME}`,
		description:
			meta.description?.trim() ||
			"Dengan penuh kebahagiaan, kami mengundang Anda untuk menghadiri pernikahan kami.",
		imageUrl: meta.imageUrl?.trim() || `${SITE_URL}/invitation/og-card.jpg`,
		host,
	};
}

/** Versi default untuk memaksa crawler mengambil metadata lama yang ter-cache. */
export const DEFAULT_LINK_VERSION = "2";

/**
 * Cache-buster untuk link blast. Berubah setiap `invitation_meta.updated_at`
 * berubah, jadi menyimpan OG baru otomatis menghasilkan URL preview baru.
 */
export function resolveLinkVersion(
	updatedAt: string | null | undefined,
): string {
	if (!updatedAt) return DEFAULT_LINK_VERSION;
	const parsed = Date.parse(updatedAt);
	return Number.isFinite(parsed) ? String(parsed) : DEFAULT_LINK_VERSION;
}
