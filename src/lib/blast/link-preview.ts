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
		imageUrl: meta.imageUrl?.trim() || `${SITE_URL}/invitation/og.jpg`,
		host,
	};
}
