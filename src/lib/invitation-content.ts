import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "./dashboard-session-server";
import { defaultContent } from "./invitation-content-default";
import {
	contentVersionChanged,
	type InvitationContent,
	parseContent,
} from "./invitation-content-schema";
import {
	FRAME_BUCKET,
	frameObjectPath,
	MUSIC_BUCKET,
	musicObjectPath,
	validateFrameUpload,
	validateMusicUpload,
} from "./invitation-upload";
import { createTtlCache } from "./server-cache";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Server functions for the editable invitation content.
 *
 * Reads are public (the invitation needs them); writes are guarded by the
 * dashboard session. Content is stored as one JSON document so a save is
 * atomic: either the whole validated document lands, or nothing changes.
 */

const TABLE = "invitation_content";
const MIGRATION_HINT =
	"Tabel invitation_content belum ada. Jalankan supabase/migrations/0005_invitation_content.sql di SQL Editor, lalu coba lagi.";

/**
 * Every invitation request reads this document, but it only changes when the
 * owner saves from the dashboard (which clears the cache). A short TTL keeps a
 * stale entry from surviving a write that happened in another process.
 */
const contentCache = createTtlCache<InvitationContent>(60_000);

interface ContentRow {
	content: unknown;
	updated_at: string;
	updated_by: string | null;
}

interface VersionRow {
	updated_at: string;
}

export interface InvitationContentSnapshot {
	content: InvitationContent;
	updatedAt: string | null;
	updatedBy: string | null;
	/** Migration 0005 has not been run; defaults are in use. */
	missingTable: boolean;
	/** The stored document failed validation and defaults are in use. */
	invalidStored: boolean;
}

export type DashboardContentResult =
	| ({ ok: true } & InvitationContentSnapshot)
	| { ok: false; error: string };

export type SaveContentResult =
	| { ok: true; updatedAt: string }
	| {
			ok: false;
			error: string;
			code?: "INVALID" | "CONFLICT" | "MISSING_TABLE";
			issues?: string[];
	  };

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
	return (
		error.code === "PGRST205" ||
		error.code === "42P01" ||
		/relation .* does not exist/i.test(error.message ?? "")
	);
}

type LoadResult =
	| { ok: true; snapshot: InvitationContentSnapshot }
	| { ok: false; error: string };

function fallbackSnapshot(
	overrides: Partial<InvitationContentSnapshot> = {},
): InvitationContentSnapshot {
	return {
		content: defaultContent,
		updatedAt: null,
		updatedBy: null,
		missingTable: false,
		invalidStored: false,
		...overrides,
	};
}

async function readContent(): Promise<LoadResult> {
	let supabase: ReturnType<typeof getSupabaseAdmin>;

	try {
		supabase = getSupabaseAdmin();
	} catch (error) {
		return { ok: false, error: errorMessage(error) };
	}

	const { data, error } = await supabase
		.from(TABLE)
		.select("content, updated_at, updated_by")
		.eq("id", 1)
		.maybeSingle();

	if (error) {
		if (isMissingTable(error)) {
			return { ok: true, snapshot: fallbackSnapshot({ missingTable: true }) };
		}
		return { ok: false, error: error.message };
	}

	if (!data) return { ok: true, snapshot: fallbackSnapshot() };

	const row = data as ContentRow;
	const parsed = parseContent(row.content);

	if (!parsed.ok) {
		// A bad stored document must not break the invitation: log it for the
		// owner and serve the authored defaults until it is saved again.
		console.error(
			"[invitation-content] dokumen tersimpan tidak valid:",
			parsed.issues,
		);
		return {
			ok: true,
			snapshot: fallbackSnapshot({
				updatedAt: row.updated_at,
				updatedBy: row.updated_by,
				invalidStored: true,
			}),
		};
	}

	return {
		ok: true,
		snapshot: {
			content: parsed.content,
			updatedAt: row.updated_at,
			updatedBy: row.updated_by,
			missingTable: false,
			invalidStored: false,
		},
	};
}

/** Public read used by the invitation loader; always resolves to usable content. */
export const getInvitationContent = createServerFn({ method: "GET" }).handler(
	async (): Promise<InvitationContent> => {
		try {
			return await contentCache.read(async () => {
				const result = await readContent();
				// Throwing keeps failures out of the cache; the caller falls back.
				if (!result.ok) throw new Error(result.error);
				return result.snapshot.content;
			});
		} catch (error) {
			console.error(
				"[invitation-content] gagal membaca konten, memakai default:",
				errorMessage(error),
			);
			return defaultContent;
		}
	},
);

/** Dashboard read: includes the version token used for optimistic concurrency. */
export const getInvitationContentForDashboard = createServerFn({
	method: "GET",
}).handler(async (): Promise<DashboardContentResult> => {
	const user = await readDashboardUser();
	if (!user) {
		return {
			ok: false,
			error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
		};
	}

	const result = await readContent();
	if (!result.ok) return { ok: false, error: result.error };

	return { ok: true, ...result.snapshot };
});

async function writeContent(
	content: InvitationContent,
	baseUpdatedAt: string | null,
	email: string,
): Promise<SaveContentResult> {
	let supabase: ReturnType<typeof getSupabaseAdmin>;

	try {
		supabase = getSupabaseAdmin();
	} catch (error) {
		return { ok: false, error: errorMessage(error) };
	}

	const { data: current, error: readError } = await supabase
		.from(TABLE)
		.select("updated_at")
		.eq("id", 1)
		.maybeSingle();

	if (readError) {
		if (isMissingTable(readError)) {
			return { ok: false, code: "MISSING_TABLE", error: MIGRATION_HINT };
		}
		return { ok: false, error: readError.message };
	}

	const currentUpdatedAt = (current as VersionRow | null)?.updated_at ?? null;
	if (contentVersionChanged(currentUpdatedAt, baseUpdatedAt)) {
		return {
			ok: false,
			code: "CONFLICT",
			error:
				"Konten sudah diubah di tab lain. Muat ulang halaman ini sebelum menyimpan lagi.",
		};
	}

	const updatedAt = new Date().toISOString();
	const { data: saved, error: saveError } = await supabase
		.from(TABLE)
		.upsert(
			{ id: 1, content, updated_at: updatedAt, updated_by: email },
			{ onConflict: "id" },
		)
		.select("updated_at")
		.single();

	if (saveError) {
		if (isMissingTable(saveError)) {
			return { ok: false, code: "MISSING_TABLE", error: MIGRATION_HINT };
		}
		return { ok: false, error: saveError.message };
	}

	// Guests should see the new content on their next request, not after the TTL.
	contentCache.clear();
	return { ok: true, updatedAt: (saved as VersionRow).updated_at };
}

export const saveInvitationContent = createServerFn({ method: "POST" })
	.inputValidator(
		(
			data: { content?: unknown; baseUpdatedAt?: string | null } | undefined,
		) => ({
			content: data?.content ?? null,
			baseUpdatedAt:
				typeof data?.baseUpdatedAt === "string" ? data.baseUpdatedAt : null,
		}),
	)
	.handler(async ({ data }): Promise<SaveContentResult> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
			};
		}

		if (data.content === null || typeof data.content !== "object") {
			return {
				ok: false,
				code: "INVALID",
				error: "Dokumen konten tidak ditemukan.",
				issues: [],
			};
		}

		const parsed = parseContent(data.content);
		if (!parsed.ok) {
			return {
				ok: false,
				code: "INVALID",
				error: parsed.error,
				issues: parsed.issues,
			};
		}

		return writeContent(parsed.content, data.baseUpdatedAt, user.email);
	});

/** Explicit reset to the authored defaults; still uses the version token. */
export const resetInvitationContent = createServerFn({ method: "POST" })
	.inputValidator((data: { baseUpdatedAt?: string | null } | undefined) => ({
		baseUpdatedAt:
			typeof data?.baseUpdatedAt === "string" ? data.baseUpdatedAt : null,
	}))
	.handler(async ({ data }): Promise<SaveContentResult> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
			};
		}

		return writeContent(defaultContent, data.baseUpdatedAt, user.email);
	});

export type MusicUploadTarget =
	| { ok: true; path: string; token: string; publicUrl: string }
	| { ok: false; error: string };

/**
 * Signed upload URL for one music file.
 *
 * The server decides the object path and validates the MIME/size before signing,
 * so the browser never picks a storage path and rejected files never land.
 */
export const createMusicUploadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: { mime?: string; size?: number } | undefined) => ({
		mime: String(data?.mime ?? ""),
		size: Number(data?.size ?? 0),
	}))
	.handler(async ({ data }): Promise<MusicUploadTarget> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
			};
		}

		const validation = validateMusicUpload({
			mime: data.mime,
			size: data.size,
		});
		if (!validation.ok) return validation;

		let supabase: ReturnType<typeof getSupabaseAdmin>;
		try {
			supabase = getSupabaseAdmin();
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}

		const path = musicObjectPath(validation.ext, crypto.randomUUID());
		const { data: signed, error } = await supabase.storage
			.from(MUSIC_BUCKET)
			.createSignedUploadUrl(path);

		if (error) {
			const message =
				/bucket/i.test(error.message) || /does not exist/i.test(error.message)
					? "Bucket invitation-media belum ada. Jalankan supabase/migrations/0006_invitation_media.sql."
					: error.message;
			return { ok: false, error: message };
		}

		const { data: urlData } = supabase.storage
			.from(MUSIC_BUCKET)
			.getPublicUrl(path);

		return {
			ok: true,
			path: signed.path,
			token: signed.token,
			publicUrl: urlData.publicUrl,
		};
	});

export type FrameUploadTarget = MusicUploadTarget;

/** Signed upload URL for one transparent frame overlay. */
export const createFrameUploadUrl = createServerFn({ method: "POST" })
	.inputValidator((data: { mime?: string; size?: number } | undefined) => ({
		mime: String(data?.mime ?? ""),
		size: Number(data?.size ?? 0),
	}))
	.handler(async ({ data }): Promise<FrameUploadTarget> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
			};
		}

		const validation = validateFrameUpload({
			mime: data.mime,
			size: data.size,
		});
		if (!validation.ok) return validation;

		let supabase: ReturnType<typeof getSupabaseAdmin>;
		try {
			supabase = getSupabaseAdmin();
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}

		const path = frameObjectPath(validation.ext, crypto.randomUUID());
		const { data: signed, error } = await supabase.storage
			.from(FRAME_BUCKET)
			.createSignedUploadUrl(path);

		if (error) {
			const message =
				/bucket/i.test(error.message) || /does not exist/i.test(error.message)
					? "Bucket invitation-frames belum ada. Jalankan supabase/migrations/0007_invitation_frames.sql."
					: error.message;
			return { ok: false, error: message };
		}

		const { data: urlData } = supabase.storage
			.from(FRAME_BUCKET)
			.getPublicUrl(path);

		return {
			ok: true,
			path: signed.path,
			token: signed.token,
			publicUrl: urlData.publicUrl,
		};
	});
