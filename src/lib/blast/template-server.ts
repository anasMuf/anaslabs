import { GUEST_SOURCES, type GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { DEFAULT_TEMPLATES } from "./template";

/**
 * Pembacaan template di sisi server (tanpa `createServerFn`), dipakai bersama
 * oleh halaman dashboard dan worker pengiriman.
 */

export const BLAST_TEMPLATES_TABLE = "blast_templates";

export interface BlastTemplateRow {
	source: GuestSource;
	body: string;
	updated_at: string;
}

export function isMissingTemplateTable(
	error: { code?: string } | null,
): boolean {
	return error?.code === "PGRST205" || error?.code === "42P01";
}

export async function loadTemplateRows(): Promise<{
	rows: BlastTemplateRow[];
	error: string | null;
}> {
	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from(BLAST_TEMPLATES_TABLE)
			.select("source, body, updated_at");

		if (error) {
			return {
				rows: [],
				error: isMissingTemplateTable(error) ? null : error.message,
			};
		}

		return { rows: (data ?? []) as BlastTemplateRow[], error: null };
	} catch (caught) {
		return {
			rows: [],
			error:
				caught instanceof Error ? caught.message : "Gagal membaca template.",
		};
	}
}

/** Template efektif: baris tersimpan, atau default kalau belum ada/tabel hilang. */
export async function readTemplateBody(source: GuestSource): Promise<string> {
	const { rows } = await loadTemplateRows();
	const stored = rows.find((row) => row.source === source)?.body?.trim();
	return stored || DEFAULT_TEMPLATES[source];
}

export async function loadTemplateMap(): Promise<
	Record<GuestSource, { body: string; updatedAt: string | null }>
> {
	const { rows } = await loadTemplateRows();
	const bySource = new Map(rows.map((row) => [row.source, row]));

	return Object.fromEntries(
		GUEST_SOURCES.map((source) => {
			const row = bySource.get(source);
			return [
				source,
				{
					body: row?.body?.trim() || DEFAULT_TEMPLATES[source],
					updatedAt: row?.updated_at ?? null,
				},
			];
		}),
	) as Record<GuestSource, { body: string; updatedAt: string | null }>;
}
