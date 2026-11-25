import { invitation } from "../../data/invitation";
import type { GuestSource } from "../guest-import";
import { SITE_URL } from "../site";

/**
 * Template pesan blast.
 *
 * Variabel dirender server-side sebelum dikirim, bukan lewat spintax Wablas:
 * data kontak Wablas tidak selalu sinkron dengan tabel tamu. Semua fungsi di
 * sini murni agar aturan render/validasi bisa diuji tanpa jaringan.
 */

export const TEMPLATE_MAX_LENGTH = 1024;

export const TEMPLATE_VARIABLES = [
	"nama",
	"grup",
	"alamat",
	"diundang",
	"link",
	"mempelai",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const TEMPLATE_VARIABLE_HELP: Array<{
	key: TemplateVariable;
	label: string;
}> = [
	{ key: "nama", label: "Nama tamu" },
	{ key: "grup", label: "Grup/keterangan (default: tamu)" },
	{ key: "alamat", label: "Alamat (default: -)" },
	{ key: "diundang", label: "Kolom DIUNDANG (default: -)" },
	{ key: "link", label: "Link undangan tamu" },
	{ key: "mempelai", label: "Nama kedua mempelai" },
];

export const DEFAULT_TEMPLATES: Record<GuestSource, string> = {
	anas: [
		"Assalamu'alaikum {nama},",
		"",
		"Dengan penuh kebahagiaan, kami mengundang Anda untuk menghadiri pernikahan kami.",
		"",
		"Terima kasih.",
		"",
		"Buka undangan:",
		"{link}",
	].join("\n"),
	mila: [
		"Assalamu'alaikum {nama},",
		"",
		"Dengan penuh kebahagiaan, kami mengundang Anda untuk menghadiri pernikahan kami.",
		"",
		"Terima kasih.",
		"",
		"Buka undangan:",
		"{link}",
	].join("\n"),
};

export const DEFAULT_COUPLE_NAME = `${invitation.cover.firstNames} & ${invitation.cover.secondNames}`;

export interface TemplateGuest {
	name: string;
	groupName: string | null;
	address: string | null;
	invited: string | null;
	slug: string;
}

export interface TemplateContext {
	coupleName?: string;
	siteUrl?: string;
}

const VARIABLE_PATTERN = /\{([A-Za-z]+)\}/g;
const KNOWN = new Set<string>(TEMPLATE_VARIABLES);

function valuesFor(
	guest: TemplateGuest,
	context: TemplateContext,
): Record<TemplateVariable, string> {
	return {
		nama: guest.name,
		grup: guest.groupName?.trim() || "tamu",
		alamat: guest.address?.trim() || "-",
		diundang: guest.invited?.trim() || "-",
		// Tanpa query string: `send-link` Wablas mengirim JSON mentah (bukan kartu)
		// bila URL mengandung `?v=...`, jadi link blast harus bersih.
		link: `${context.siteUrl ?? SITE_URL}/invitation/${guest.slug}`,
		mempelai: context.coupleName?.trim() || DEFAULT_COUPLE_NAME,
	};
}

export function unknownVariables(body: string): string[] {
	const unknown = new Set<string>();
	for (const match of body.matchAll(VARIABLE_PATTERN)) {
		const key = match[1].toLowerCase();
		if (!KNOWN.has(key)) unknown.add(`{${match[1]}}`);
	}
	return [...unknown];
}

export function validateTemplate(
	body: string,
): { ok: true; body: string } | { ok: false; error: string } {
	const text = String(body ?? "")
		.replace(/\r\n?/g, "\n")
		.trim();
	if (!text) return { ok: false, error: "Template tidak boleh kosong." };
	if (text.length > TEMPLATE_MAX_LENGTH) {
		return {
			ok: false,
			error: `Template ${text.length} karakter; maksimal ${TEMPLATE_MAX_LENGTH} karakter.`,
		};
	}

	const unknown = unknownVariables(text);
	if (unknown.length) {
		return {
			ok: false,
			error: `Variabel tidak dikenal: ${unknown.join(", ")}. Gunakan: {${TEMPLATE_VARIABLES.join("}, {")}}.`,
		};
	}

	return { ok: true, body: text };
}

export function renderTemplate(
	body: string,
	guest: TemplateGuest,
	context: TemplateContext = {},
): string {
	const values = valuesFor(guest, context);
	return body.replace(VARIABLE_PATTERN, (match, rawKey: string) => {
		const key = rawKey.toLowerCase();
		if (!KNOWN.has(key)) return match;
		return values[key as TemplateVariable];
	});
}
