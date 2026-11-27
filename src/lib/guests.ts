import { createServerFn } from "@tanstack/react-start";
import { parseBlastChannel } from "./blast/attribution";
import { readDashboardUser } from "./dashboard-session-server";
import {
	type ExistingGuest,
	GUEST_NAME_MAX,
	GUEST_PAGE_SIZE,
	GUEST_PREVIEW_SAMPLE,
	type GuestDelivery,
	type GuestImportPlan,
	type GuestParseIssue,
	type GuestSource,
	guestNameKey,
	normalizeGuestPhone,
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
	"id, slug, name, name_key, source_sheet, group_name, address, invited, delivery, phone, blast_channel, sent_at, invitation_opened_at, archived_at";

/** Select sebelum migrasi 0009: dipakai sebagai fallback agar daftar tamu tidak
 * ikut rusak ketika kolom `blast_channel` belum ada. */
const GUEST_COLUMNS_LEGACY =
	"id, slug, name, name_key, source_sheet, group_name, address, invited, delivery, phone, sent_at, invitation_opened_at, archived_at";

const MIGRATION_HINT =
	"Tabel guests belum lengkap. Jalankan supabase/migrations/0003_guests.sql lalu 0004_guest_details.sql di SQL Editor, kemudian coba lagi.";

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
	address: string | null;
	invited: string | null;
	source: GuestSource;
	delivery: GuestDelivery;
	phone: string | null;
	/** Override nomor pengirim; null berarti ikut `source`. */
	blastChannel: GuestSource | null;
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
	address: string | null;
	invited: string | null;
	delivery: GuestDelivery;
	phone: string | null;
	blast_channel: GuestSource | null;
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
		address: row.address,
		invited: row.invited,
		source: row.source_sheet,
		delivery: row.delivery,
		phone: row.phone,
		blastChannel: row.blast_channel ?? null,
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
		address: row.address,
		invited: row.invited,
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

function needsMigration(error: { code?: string }): boolean {
	// PGRST205 = table not in schema cache; 42703 = column does not exist.
	return error.code === "PGRST205" || error.code === "42703";
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

export interface GuestPage {
	rows: DashboardGuest[];
	/** Active (non-archived) guests matching the query. */
	total: number;
}

export interface GuestStats {
	total: number;
	digital: number;
	fisik: number;
	sent: number;
	opened: number;
	archived: number;
}

export type GuestSentFilter = "" | "sent" | "unsent";
export type GuestOpenedFilter = "" | "opened" | "unopened";
export type GuestSourceFilter = "" | GuestSource;
export type GuestDeliveryFilter = "" | GuestDelivery;

export interface GuestFilters {
	source: GuestSourceFilter;
	group: string;
	address: string;
	delivery: GuestDeliveryFilter;
	sent: GuestSentFilter;
	opened: GuestOpenedFilter;
}

export const EMPTY_GUEST_FILTERS: GuestFilters = {
	source: "",
	group: "",
	address: "",
	delivery: "",
	sent: "",
	opened: "",
};

export interface GuestFilterOptions {
	all: GuestFilterSet;
	anas: GuestFilterSet;
	mila: GuestFilterSet;
}

export interface GuestFilterSet {
	groups: string[];
	addresses: string[];
}

export const GUEST_PAGE_MAX = 100;

/**
 * Strips the characters that would break PostgREST's `or=` filter syntax
 * (commas/parentheses) or turn the search into a wildcard match (`%`, `*`).
 */
function searchTerm(query: string): string {
	return query
		.replace(/[%,()*]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 60);
}

/** One page of the guest table, active rows only, ordered by sheet then name. */
export const listGuestsPage = createServerFn({ method: "GET" })
	.inputValidator(
		(data: {
			offset?: number;
			limit?: number;
			query?: string;
			source?: string;
			group?: string;
			address?: string;
			delivery?: string;
			sent?: string;
			opened?: string;
		}) => ({
			offset: Math.max(0, Math.floor(Number(data?.offset) || 0)),
			limit: Math.min(
				GUEST_PAGE_MAX,
				Math.max(1, Math.floor(Number(data?.limit) || GUEST_PAGE_SIZE)),
			),
			query: String(data?.query ?? "")
				.slice(0, 80)
				.trim(),
			source:
				data?.source === "mila" || data?.source === "anas" ? data.source : "",
			group: String(data?.group ?? "").slice(0, 60),
			address: String(data?.address ?? "").slice(0, 120),
			delivery:
				data?.delivery === "digital" || data?.delivery === "fisik"
					? data.delivery
					: "",
			sent: data?.sent === "sent" || data?.sent === "unsent" ? data.sent : "",
			opened:
				data?.opened === "opened" || data?.opened === "unopened"
					? data.opened
					: "",
		}),
	)
	.handler(async ({ data }): Promise<GuestPage> => {
		await requireDashboardUser();

		const term = searchTerm(data.query);
		const pattern = `%${term}%`;

		const supabase = getSupabaseAdmin();

		const runPage = (columns: string) => {
			let request = supabase
				.from("guests")
				.select(columns, { count: "exact" })
				.is("archived_at", null);

			if (data.source) request = request.eq("source_sheet", data.source);
			if (data.group) request = request.eq("group_name", data.group);
			if (data.address) request = request.eq("address", data.address);
			if (data.delivery) request = request.eq("delivery", data.delivery);

			if (data.sent === "sent") request = request.not("sent_at", "is", null);
			if (data.sent === "unsent") request = request.is("sent_at", null);

			// "Dibuka" hanya ada untuk tamu digital; undangan fisik tidak punya
			// link untuk dibuka, jadi dikecualikan (bukan dihitung "belum buka").
			if (data.opened) {
				request = request.eq("delivery", "digital");
				request =
					data.opened === "opened"
						? request.not("invitation_opened_at", "is", null)
						: request.is("invitation_opened_at", null);
			}

			if (term) {
				request = request.or(
					[
						`name.ilike.${pattern}`,
						`group_name.ilike.${pattern}`,
						`address.ilike.${pattern}`,
						`invited.ilike.${pattern}`,
						`slug.ilike.${pattern}`,
						`phone.ilike.${pattern}`,
					].join(","),
				);
			}

			return (
				request
					// `id` keeps pagination stable when two guests share a sorted name.
					.order("source_sheet", { ascending: true })
					.order("name_key", { ascending: true })
					.order("id", { ascending: true })
					.range(data.offset, data.offset + data.limit - 1)
			);
		};

		let result = await runPage(GUEST_COLUMNS);
		// 42703 = kolom belum ada (migrasi 0009 belum dijalankan).
		if (result.error?.code === "42703") {
			result = await runPage(GUEST_COLUMNS_LEGACY);
		}

		const { data: rows, count, error } = result;

		if (error) {
			throw new Error(needsMigration(error) ? MIGRATION_HINT : error.message);
		}

		return {
			rows: ((rows ?? []) as unknown as GuestRow[]).map(toDashboardGuest),
			total: count ?? 0,
		};
	});

/** Distinct groups and addresses per sheet, for the dependent filter dropdowns. */
export const getGuestFilterOptions = createServerFn({ method: "GET" }).handler(
	async (): Promise<GuestFilterOptions> => {
		await requireDashboardUser();
		const supabase = getSupabaseAdmin();

		const { data, error } = await supabase
			.from("guests")
			.select("source_sheet, group_name, address")
			.is("archived_at", null);

		if (error) {
			throw new Error(needsMigration(error) ? MIGRATION_HINT : error.message);
		}

		const rows = data as Array<{
			source_sheet: GuestSource;
			group_name: string | null;
			address: string | null;
		}>;

		const collect = (values: Array<string | null>) =>
			Array.from(
				new Set(values.filter((value): value is string => Boolean(value))),
			).sort((a, b) => a.localeCompare(b));

		const build = (subset: typeof rows): GuestFilterSet => ({
			groups: collect(subset.map((row) => row.group_name)),
			addresses: collect(subset.map((row) => row.address)),
		});

		return {
			all: build(rows),
			anas: build(rows.filter((row) => row.source_sheet === "anas")),
			mila: build(rows.filter((row) => row.source_sheet === "mila")),
		};
	},
);

/** Headline counters; separate from the page so scrolling does not recount rows. */
export const getGuestStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<GuestStats> => {
		await requireDashboardUser();
		const supabase = getSupabaseAdmin();

		const active = () =>
			supabase
				.from("guests")
				.select("id", { count: "exact", head: true })
				.is("archived_at", null);

		const [total, digital, fisik, sent, opened, archived] = await Promise.all([
			active(),
			active().eq("delivery", "digital"),
			active().eq("delivery", "fisik"),
			active().not("sent_at", "is", null),
			// Only digital guests can open an invitation.
			active()
				.eq("delivery", "digital")
				.not("invitation_opened_at", "is", null),
			supabase
				.from("guests")
				.select("id", { count: "exact", head: true })
				.not("archived_at", "is", null),
		]);

		const firstError = [total, digital, fisik, sent, opened, archived].find(
			(result) => result.error,
		)?.error;
		if (firstError) {
			throw new Error(
				needsMigration(firstError) ? MIGRATION_HINT : firstError.message,
			);
		}

		return {
			total: total.count ?? 0,
			digital: digital.count ?? 0,
			fisik: fisik.count ?? 0,
			sent: sent.count ?? 0,
			opened: opened.count ?? 0,
			archived: archived.count ?? 0,
		};
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
		// Load every guest, not just this sheet: `slug` is unique across the whole
		// table, so a Mila name must not reuse a slug Anas already took.
		const { data: rows, error } = await supabase
			.from("guests")
			.select(GUEST_COLUMNS);

		if (error) {
			return {
				ok: false,
				error: needsMigration(error) ? MIGRATION_HINT : error.message,
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
						address: guest.address,
						invited: guest.invited,
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
					slug: entry.slug,
					source_sheet: entry.source,
					name: entry.name,
					name_key: entry.nameKey,
					group_name: entry.groupName,
					address: entry.address,
					invited: entry.invited,
					delivery: entry.delivery,
					phone: entry.phone,
					sent_at: entry.sentAt,
					updated_at: now,
				})),
				...plan.restore.map((entry) => ({
					id: entry.id,
					slug: entry.slug,
					source_sheet: entry.source,
					name: entry.name,
					name_key: entry.nameKey,
					group_name: entry.groupName,
					address: entry.address,
					invited: entry.invited,
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

function optionalText(value: unknown, max: number): string | null {
	const text = String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, max);
	// The sheet uses "-" for empty; keep that meaning when editing by hand.
	return !text || text === "-" || text === "—" ? null : text;
}

type GuestMutation =
	| { ok: true; guest: DashboardGuest }
	| { ok: false; error: string };

/**
 * Manual edit from the dashboard. `slug` is deliberately never written: it is
 * the permanent identity of the invitation link. `name_key` follows the new
 * name so the next sheet import still recognises this guest, and the unique
 * `(source_sheet, name_key, group_name)` index reports a real collision.
 */
export const updateGuest = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id?: string;
			name?: string;
			groupName?: string;
			address?: string;
			invited?: string;
			delivery?: string;
			phone?: string;
			blastChannel?: string;
		}) => ({
			id: String(data?.id ?? "")
				.trim()
				.slice(0, 64),
			name: String(data?.name ?? "")
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, GUEST_NAME_MAX),
			groupName: optionalText(data?.groupName, 60),
			address: optionalText(data?.address, 120),
			invited: optionalText(data?.invited, 60),
			delivery: data?.delivery === "fisik" ? "fisik" : "digital",
			phone: String(data?.phone ?? ""),
			blastChannel: parseBlastChannel(data?.blastChannel),
		}),
	)
	.handler(async ({ data }): Promise<GuestMutation> => {
		await requireDashboardUser();
		if (!data.id) return { ok: false, error: "Tamu tidak dikenal." };

		const nameKey = guestNameKey(data.name);
		if (!nameKey) return { ok: false, error: "Nama tamu tidak boleh kosong." };

		const supabase = getSupabaseAdmin();
		const { data: row, error } = await supabase
			.from("guests")
			.update({
				name: data.name,
				name_key: nameKey,
				group_name: data.groupName,
				address: data.address,
				invited: data.invited,
				delivery: data.delivery,
				phone: normalizeGuestPhone(data.phone),
				blast_channel: data.blastChannel,
				updated_at: new Date().toISOString(),
			})
			.eq("id", data.id)
			.select(GUEST_COLUMNS)
			.maybeSingle();

		if (error) {
			if (error.code === "23505")
				return {
					ok: false,
					error:
						"Nama dan grup itu sudah dipakai tamu lain di sheet yang sama. Ubah salah satunya.",
				};
			return {
				ok: false,
				error: needsMigration(error) ? MIGRATION_HINT : error.message,
			};
		}
		if (!row) return { ok: false, error: "Tamu tidak ditemukan." };

		return { ok: true, guest: toDashboardGuest(row as GuestRow) };
	});

/**
 * "Hapus" from the dashboard is a soft archive: the row disappears from the
 * active list and counts, but the slug keeps resolving so links that are
 * already shared do not die. Importing the name again restores it.
 */
export const archiveGuest = createServerFn({ method: "POST" })
	.inputValidator((data: { id?: string }) => ({
		id: String(data?.id ?? "").slice(0, 64),
	}))
	.handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
		await requireDashboardUser();
		if (!data.id) return { ok: false, error: "Tamu tidak dikenal." };

		const now = new Date().toISOString();
		const supabase = getSupabaseAdmin();
		const { error } = await supabase
			.from("guests")
			.update({ archived_at: now, updated_at: now })
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

/** Lightweight active-guest list for browser-side contact matching. */
export interface GuestOption {
	id: string;
	name: string;
	slug: string;
	source: GuestSource;
	groupName: string | null;
	phone: string | null;
}

export const listGuestOptions = createServerFn({ method: "GET" }).handler(
	async (): Promise<GuestOption[]> => {
		await requireDashboardUser();
		const supabase = getSupabaseAdmin();

		const { data, error } = await supabase
			.from("guests")
			.select("id, name, slug, source_sheet, group_name, phone")
			.is("archived_at", null)
			.order("name_key", { ascending: true })
			.order("id", { ascending: true });

		if (error) {
			throw new Error(needsMigration(error) ? MIGRATION_HINT : error.message);
		}

		return (
			data as Array<{
				id: string;
				name: string;
				slug: string;
				source_sheet: GuestSource;
				group_name: string | null;
				phone: string | null;
			}>
		).map((row) => ({
			id: row.id,
			name: row.name,
			slug: row.slug,
			source: row.source_sheet,
			groupName: row.group_name,
			phone: row.phone,
		}));
	},
);

/**
 * Contact import: apply confirmed phone numbers only.
 *
 * Deliberately a narrow update — name, group, slug, delivery, and archival
 * state are never touched by this flow. Each row is written separately so one
 * bad id cannot roll back the rest.
 */
export interface GuestPhoneApplyResult {
	ok: boolean;
	updated: number;
	failed: Array<{ id: string; error: string }>;
}

export const applyGuestPhones = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { entries?: Array<{ id?: unknown; phone?: unknown }> }) => ({
			entries: (Array.isArray(data?.entries) ? data.entries : [])
				.slice(0, 2000)
				.map((entry) => ({
					id: String(entry?.id ?? "")
						.trim()
						.slice(0, 64),
					phone: String(entry?.phone ?? ""),
				})),
		}),
	)
	.handler(async ({ data }): Promise<GuestPhoneApplyResult> => {
		await requireDashboardUser();

		const supabase = getSupabaseAdmin();
		const now = new Date().toISOString();
		let updated = 0;
		const failed: GuestPhoneApplyResult["failed"] = [];

		for (const entry of data.entries) {
			const phone = normalizeGuestPhone(entry.phone);
			if (!entry.id || !phone) {
				failed.push({
					id: entry.id || "?",
					error: phone ? "ID tamu kosong." : "Nomor tidak valid.",
				});
				continue;
			}

			const { error } = await supabase
				.from("guests")
				.update({ phone, updated_at: now })
				.eq("id", entry.id);

			if (error) {
				failed.push({ id: entry.id, error: error.message });
			} else {
				updated += 1;
			}
		}

		return { ok: failed.length === 0, updated, failed };
	});

/**
 * Slug → display name for the invitation page and the wall.
 *
 * Moved to `guest-lookup.ts`: the server-function bundler only exposes server
 * functions from a module, so plain helpers must live elsewhere.
 */
