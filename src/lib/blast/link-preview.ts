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

export interface PreparedLinkMessage {
	/** Teks yang dikirim ke Wablas; URL dipisah untuk preview. */
	text: string;
	url: string | null;
	/** Teks yang tampil di WhatsApp setelah Wablas menambahkan URL di akhir. */
	displayText: string;
}

/**
 * Menyiapkan pesan untuk `send-link` Wablas.
 *
 * Wablas selalu menambahkan URL preview di akhir pesan. Supaya label seperti
 * "Buka undangan:" tidak menggantung, label dipindah ke akhir teks. Fungsi ini
 * juga dipakai pratinjau, sehingga tampilan dashboard = pesan yang dikirim.
 */
export function prepareLinkPreviewMessage(
	message: string,
): PreparedLinkMessage {
	const url = firstUrl(message);
	if (!url) return { text: message, url: null, displayText: message };

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

	return {
		text: body,
		url,
		displayText: body ? `${body}\n${url}` : url,
	};
}
