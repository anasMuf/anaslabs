import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "../dashboard-session-server";
import { GUEST_SOURCES, type GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { DEFAULT_TEMPLATES, validateTemplate } from "./template";
import {
	BLAST_TEMPLATES_TABLE,
	isMissingTemplateTable,
	loadTemplateMap,
} from "./template-server";

/**
 * Server functions template blast.
 *
 * Template disimpan per mempelai; baris yang tidak ada berarti default dipakai.
 * Validasi (variabel dikenal + maks 1024 karakter) terjadi sebelum simpan.
 */

export interface BlastTemplateView {
	source: GuestSource;
	body: string;
	updatedAt: string | null;
	custom: boolean;
}

export interface BlastTemplatesResult {
	templates: BlastTemplateView[];
	error: string | null;
}

export type BlastTemplateMutation =
	| { ok: true; template: BlastTemplateView }
	| { ok: false; error: string };

async function requireDashboardUser(): Promise<void> {
	const user = await readDashboardUser();
	if (!user)
		throw new Error("Sesi dashboard tidak valid. Silakan masuk ulang.");
}

function parseSource(value: unknown): GuestSource {
	return value === "mila" ? "mila" : "anas";
}

function toViews(
	map: Record<GuestSource, { body: string; updatedAt: string | null }>,
): BlastTemplateView[] {
	return GUEST_SOURCES.map((source) => ({
		source,
		body: map[source].body,
		updatedAt: map[source].updatedAt,
		custom: map[source].updatedAt !== null,
	}));
}

export const listBlastTemplates = createServerFn({ method: "GET" }).handler(
	async (): Promise<BlastTemplatesResult> => {
		await requireDashboardUser();
		const map = await loadTemplateMap();
		return { templates: toViews(map), error: null };
	},
);

export const saveBlastTemplate = createServerFn({ method: "POST" })
	.inputValidator((data: { source?: string; body?: string }) => ({
		source: parseSource(data?.source),
		body: String(data?.body ?? ""),
	}))
	.handler(async ({ data }): Promise<BlastTemplateMutation> => {
		await requireDashboardUser();

		const validation = validateTemplate(data.body);
		if (!validation.ok) return { ok: false, error: validation.error };

		const now = new Date().toISOString();
		const supabase = getSupabaseAdmin();
		const { error } = await supabase.from(BLAST_TEMPLATES_TABLE).upsert(
			{
				source: data.source,
				body: validation.body,
				updated_at: now,
			},
			{ onConflict: "source" },
		);

		if (error) {
			return {
				ok: false,
				error: isMissingTemplateTable(error)
					? "Tabel blast_templates belum ada. Jalankan supabase/migrations/0009_blast.sql."
					: error.message,
			};
		}

		return {
			ok: true,
			template: {
				source: data.source,
				body: validation.body,
				updatedAt: now,
				custom: true,
			},
		};
	});

export const resetBlastTemplate = createServerFn({ method: "POST" })
	.inputValidator((data: { source?: string }) => ({
		source: parseSource(data?.source),
	}))
	.handler(async ({ data }): Promise<BlastTemplateMutation> => {
		await requireDashboardUser();

		const supabase = getSupabaseAdmin();
		const { error } = await supabase
			.from(BLAST_TEMPLATES_TABLE)
			.delete()
			.eq("source", data.source);

		if (error && !isMissingTemplateTable(error)) {
			return { ok: false, error: error.message };
		}

		return {
			ok: true,
			template: {
				source: data.source,
				body: DEFAULT_TEMPLATES[data.source],
				updatedAt: null,
				custom: false,
			},
		};
	});
