import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "./dashboard-session-server";
import {
	type ExistingGuest,
	GUEST_PREVIEW_SAMPLE,
	type GuestDelivery,
	type GuestImportPlan,
	type GuestParseIssue,
	type GuestSource,
	type ParsedGuestRow,
	parseGuestTable,
	planGuestImport,
} from "./guest-import";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Guest list server functions.
 *
 * Same shape as the wall: every read/write uses the secret key inside a server
 * function, so the browser never sees the table (it holds phone numbers). The
 * invitation page only ever learns a display name from the slug.
 */

const GUEST_COLUMNS =
	"id, slug, name, name_key, source_sheet, group_name, delivery, phone, sent_at, invitation_opened_at, archived_at";

const MIGRATION_HINT =
	"Tabel guests belum ada. Jalankan supabase/migrations/0003_guests.sql di SQL Editor, lalu coba lagi.";

const PARSE_ERRORS: Record<Exclude<GuestParseIssue, "too-many">, string> = {
	empty: "Tidak ada yang ditempel. Salin dulu baris tamu dari Google Sheets.",
	"no-header":
		"Kolom NAMA tidak ditemukan. Ikutkan baris judul kolom (NAMA, KETERANGAN, FISIK/DIGITAL, STATUS PENGIRIMAN) saat menyalin.",
};

const WRITE_CHUNK = 200;

export interface DashboardGuest {
	id: string;
	slug: string;
	name: string;
	groupName: string | null;
	source: GuestSource;
	delivery: GuestDelivery;
	phone: string | null;
	sent: boolean;
	openedAt: string | null;
	archived: boolean;
}

interface GuestRow {
	id: string;
	slug: string;
	name: string;
	name_key: string;
	source_sheet: GuestSource;
	group_name: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	sent_at: string | null;
	invitation_opened_at: string | null;
	archived_at: string | null;
}

function toDashboardGuest(row: GuestRow): DashboardGuest {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		groupName: row.group_name,
		source: row.source_sheet,
		delivery: row.delivery,
		phone: row.phone,
		sent: Boolean(row.sent_at),
		openedAt: row.invitation_opened_at,
		archived: Boolean(row.archived_at),
	};
}

function toExistingGuest(row: GuestRow): ExistingGuest {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		nameKey: row.name_key,
		source: row.source_sheet,
		groupName: row.group_name,
		delivery: row.delivery,
		phone: row.phone,
		sentAt: row.sent_at,
		archived: Boolean(row.archived_at),
	};
}

async function requireDashboardUser(): Promise<void> {
	const user = await readDashboardUser();
	if (!user)
		throw new Error("Sesi dashboard tidak valid. Silakan masuk ulang.");
}

function isMissingTable(error: { code?: string }): boolean {
	return error.code === "PGRST205";
}

export interface GuestImportCounts {
	parsed: number;
	skipped: number;
	duplicates: number;
	create: number;
	update: number;
	restore: number;
	archive: number;
	unchanged: number;
}

export interface GuestImportPreview {
	source: GuestSource;
	counts: GuestImportCounts;
	/** Sample names so the import can be eyeballed before it is applied. */
	create: string[];
	update: string[];
	restore: string[];
	archive: string[];
	/** Set when the paste was longer than the import cap. */
	truncated: boolean;
}

type ImportResult =
	| { ok: true; applied: boolean; preview: GuestImportPreview }
	| { ok: false; error: string };

function toPreview(
	source: GuestSource,
	parsed: {
		rows: ParsedGuestRow[];
		skipped: number;
		duplicates: number;
		issue?: GuestParseIssue;
	},
	plan: GuestImportPlan,
): GuestImportPreview {
	const names = (entries: Array<{ name: string }>) =>
		entries.slice(0, GUEST_PREVIEW_SAMPLE).map((entry) => entry.name);

	return {
		source,
		counts: {
			parsed: parsed.rows.length,
			skipped: parsed.skipped,
			duplicates: parsed.duplicates,
			create: plan.create.length,
			update: plan.update.length,
			restore: plan.restore.length,
			archive: plan.archive.length,
			unchanged: plan.unchanged,
		},
		create: names(plan.create),
		update: names(plan.update),
		restore: names(plan.restore),
		archive: names(plan.archive),
		truncated: parsed.issue === "too-many",
	};
}

export const listGuests = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardGuest[]> => {
		await requireDashboardUser();

		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from("guests")
			.select(GUEST_COLUMNS)
			.order("source_sheet", { ascending: true })
			.order("name_key", { ascending: true });

		if (error) {
			throw new Error(isMissingTable(error) ? MIGRATION_HINT : error.message);
		}

		return (data as GuestRow[]).map(toDashboardGuest);
	},
);

/**
 * Paste-import. `apply: false` only reports what would change, so the dashboard
 * can show a preview before touching the table.
 */
export const importGuests = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { source?: GuestSource; text?: string; apply?: boolean }) => ({
			source: data?.source === "mila" ? ("mila" as const) : ("anas" as const),
			text: String(data?.text ?? "").slice(0, 400_000),
			apply: Boolean(data?.apply),
		}),
	)
	.handler(async ({ data }): Promise<ImportResult> => {
		await requireDashboardUser();

		const parsed = parseGuestTable(data.text);
		if (parsed.issue && parsed.issue !== "too-many") {
			return { ok: false, error: PARSE_ERRORS[parsed.issue] };
		}
		if (!parsed.rows.length) {
			return {
				ok: false,
				error: "Tidak ada nama tamu yang terbaca dari tempelan itu.",
			};
		}

		const supabase = getSupabaseAdmin();
		const { data: rows, error } = await supabase
			.from("guests")
			.select(GUEST_COLUMNS)
			.eq("source_sheet", data.source);

		if (error) {
			return {
				ok: false,
				error: isMissingTable(error) ? MIGRATION_HINT : error.message,
			};
		}

		const existing = (rows as GuestRow[]).map(toExistingGuest);
		const plan = planGuestImport(parsed.rows, existing, data.source);
		const preview = toPreview(data.source, parsed, plan);

		if (!data.apply) return { ok: true, applied: false, preview };

		const now = new Date().toISOString();

		try {
			for (let index = 0; index < plan.create.length; index += WRITE_CHUNK) {
				const chunk = plan.create
					.slice(index, index + WRITE_CHUNK)
					.map((guest) => ({
						slug: guest.slug,
						name: guest.name,
						name_key: guest.nameKey,
						source_sheet: guest.source,
						group_name: guest.groupName,
						delivery: guest.delivery,
						phone: guest.phone,
						sent_at: guest.sentAt,
						updated_at: now,
					}));

				const { error: insertError } = await supabase
					.from("guests")
					.insert(chunk);
				if (insertError) throw new Error(insertError.message);
			}

			// `upsert` by id updates only the columns present in the payload, so
			// `invitation_opened_at` and `created_at` stay untouched.
			const changedRows = [
				...plan.update.map((entry) => ({
					id: entry.id,
					name: entry.name,
					name_key: entry.nameKey,
					group_name: entry.groupName,
					delivery: entry.delivery,
					phone: entry.phone,
					sent_at: entry.sentAt,
					updated_at: now,
				})),
				...plan.restore.map((entry) => ({
					id: entry.id,
					name: entry.name,
					name_key: entry.nameKey,
					group_name: entry.groupName,
					delivery: entry.delivery,
					phone: entry.phone,
					sent_at: entry.sentAt,
					archived_at: null,
					updated_at: now,
				})),
			];

			for (let index = 0; index < changedRows.length; index += WRITE_CHUNK) {
				const { error: upsertError } = await supabase
					.from("guests")
					.upsert(changedRows.slice(index, index + WRITE_CHUNK), {
						onConflict: "id",
					});
				if (upsertError) throw new Error(upsertError.message);
			}

			const archiveIds = plan.archive.map((guest) => guest.id);
			for (let index = 0; index < archiveIds.length; index += WRITE_CHUNK) {
				const { error: archiveError } = await supabase
					.from("guests")
					.update({ archived_at: now, updated_at: now })
					.in("id", archiveIds.slice(index, index + WRITE_CHUNK));
				if (archiveError) throw new Error(archiveError.message);
			}
		} catch (error) {
			return {
				ok: false,
				error:
					error instanceof Error
						? `Impor gagal di tengah jalan: ${error.message}`
						: "Impor gagal.",
			};
		}

		return { ok: true, applied: true, preview };
	});

export const setGuestSent = createServerFn({ method: "POST" })
	.inputValidator((data: { id?: string; sent?: boolean }) => ({
		id: String(data?.id ?? ""),
		sent: Boolean(data?.sent),
	}))
	.handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
		await requireDashboardUser();
		if (!data.id) return { ok: false, error: "Tamu tidak dikenal." };

		const now = new Date().toISOString();
		const supabase = getSupabaseAdmin();
		const { error } = await supabase
			.from("guests")
			.update({ sent_at: data.sent ? now : null, updated_at: now })
			.eq("id", data.id);

		if (error) return { ok: false, error: error.message };
		return { ok: true };
	});

/** Called from the invitation page; records the first open only. */
export const markGuestOpened = createServerFn({ method: "POST" })
	.inputValidator((data: { slug?: string }) => ({
		slug: String(data?.slug ?? "")
			.trim()
			.toLowerCase()
			.slice(0, 80),
	}))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		if (!data.slug) return { ok: false };

		try {
			const supabase = getSupabaseAdmin();
			const { error } = await supabase
				.from("guests")
				.update({ invitation_opened_at: new Date().toISOString() })
				.eq("slug", data.slug)
				.is("invitation_opened_at", null);

			if (error) return { ok: false };
		} catch {
			// Migration 0003 may not have run yet; tracking is not worth an error page.
			return { ok: false };
		}

		return { ok: true };
	});

/**
 * Slug → display name for the invitation page and the wall.
 *
 * Moved to `guest-lookup.ts`: the server-function bundler only exposes server
 * functions from a module, so plain helpers must live elsewhere.
 */
