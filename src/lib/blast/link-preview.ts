import { SITE_URL } from "../site";
import { DEFAULT_COUPLE_NAME } from "./template";
import { firstUrl } from "./url";

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

/**
 * Gambar OG default. Query `v` dipakai karena kartu preview (termasuk thumbnail)
 * di-cache per URL oleh WhatsApp/Wablas; tanpa versi baru, kegagalan lama
 * diambil terus walau file sudah diperbaiki.
 */
export function defaultOgImageUrl(version?: string | null): string {
	const value = version?.trim() || DEFAULT_LINK_VERSION;
	return `${SITE_URL}/invitation/og-card.jpg?v=${encodeURIComponent(value)}`;
}

/**
 * Padanan visual dari kartu OG yang akan dibuat WhatsApp untuk tautan
 * undangan. Nilai kosong memakai default yang sama dengan `head()` undangan.
 */
export function buildLinkPreview(
	meta: InvitationMetaLike,
	version?: string | null,
): LinkPreviewInfo {
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
		imageUrl: meta.imageUrl?.trim() || defaultOgImageUrl(version),
		host,
	};
}

export interface PreparedLinkMessage {
	/** Teks yang dikirim ke Wablas; URL dipisah karena dirender sebagai kartu. */
	text: string;
	url: string | null;
}

/**
 * Menyiapkan pesan untuk `send-link` Wablas.
 *
 * WhatsApp menampilkan URL preview di akhir balon, jadi label seperti
 * "Buka undangan:" dipindah ke akhir teks supaya tidak menggantung. Fungsi ini
 * juga dipakai pratinjau, sehingga tampilan dashboard = pesan yang dikirim.
 */
export function prepareLinkPreviewMessage(
	message: string,
): PreparedLinkMessage {
	const url = firstUrl(message);
	if (!url) return { text: message, url: null };

	const lines = message.replace(/\r\n?/g, "\n").split("\n");
	const kept: string[] = [];
	let trailingLabel = "";

	for (const line of lines) {
		if (!line.includes(url)) {
			kept.push(line);
			continue;
		}

		const index = line.indexOf(url);
		const before = line.slice(0, index).trim();
		const after = line.slice(index + url.length).trim();

		if (!after && before.endsWith(":")) {
			trailingLabel = before;
			continue;
		}

		const remainder = `${before} ${after}`.trim();
		if (remainder) kept.push(remainder);
	}

	const text = kept
		.join("\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	const body = trailingLabel
		? text
			? `${text}\n\n${trailingLabel}`
			: trailingLabel
		: text;

	return { text: body, url };
}
