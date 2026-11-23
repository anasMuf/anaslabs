import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "./dashboard-session-server";
import { findGuest } from "./guest-lookup";
import { getSupabaseAdmin } from "./supabase-admin";
import {
	validateWallPublish,
	WALL_ERROR_MESSAGES,
	WALL_MAX_CARDS,
	WALL_RATE_LIMIT,
	WALL_RATE_WINDOW_MS,
	type WallPublishInput,
} from "./wall-validation";

/**
 * Photo wall server functions.
 *
 * Every read and write goes through here with the Supabase secret key, so the
 * browser never holds a key and the `wall` bucket stays private: images are
 * handed out as signed URLs that expire after an hour.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const BUCKET = "wall";
const CARD_COLUMNS =
	"id, guest_name, message, thumb_path, photo_path, audio_path, audio_duration_ms, created_at";

export interface WallCard {
	id: string;
	guestName: string;
	message: string | null;
	thumbUrl: string;
	photoUrl: string;
	audioUrl: string | null;
	audioDurationMs: number | null;
	createdAt: string;
}

interface WallRow {
	id: string;
	guest_name: string;
	message: string | null;
	thumb_path: string;
	photo_path: string;
	audio_path: string | null;
	audio_duration_ms: number | null;
	created_at: string;
}

type PublishResult =
	| { ok: true; card: WallCard }
	| { ok: false; error: string };

type DeleteResult = { ok: true } | { ok: false; error: string };

/** `createSignedUrls` accepts a batch; chunk it so 300 cards stay within limits. */
async function signPaths(
	supabase: ReturnType<typeof getSupabaseAdmin>,
	paths: string[],
): Promise<Record<string, string>> {
	const urls: Record<string, string> = {};

	for (let index = 0; index < paths.length; index += 100) {
		const chunk = paths.slice(index, index + 100);
		const { data, error } = await supabase.storage
			.from(BUCKET)
			.createSignedUrls(chunk, SIGNED_URL_TTL_SECONDS);

		if (error) throw new Error(error.message);
		for (const item of data ?? []) {
			if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
		}
	}

	return urls;
}

function toCard(row: WallRow, urls: Record<string, string>): WallCard {
	return {
		id: row.id,
		guestName: row.guest_name,
		message: row.message,
		thumbUrl: urls[row.thumb_path] ?? "",
		photoUrl: urls[row.photo_path] ?? "",
		audioUrl: row.audio_path ? (urls[row.audio_path] ?? null) : null,
		audioDurationMs: row.audio_duration_ms,
		createdAt: row.created_at,
	};
}

export const listWallCards = createServerFn({ method: "GET" })
	.inputValidator((data: { limit?: number } | undefined) => ({
		limit: Math.min(Math.max(Number(data?.limit ?? 24), 1), 60),
	}))
	.handler(async ({ data }): Promise<WallCard[]> => {
		const supabase = getSupabaseAdmin();
		const { data: rows, error } = await supabase
			.from("wall_cards")
			.select(CARD_COLUMNS)
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.limit(data.limit);

		if (error) throw new Error(error.message);
		if (!rows?.length) return [];

		const paths = rows.flatMap((row) =>
			[row.thumb_path, row.photo_path, row.audio_path].filter(
				(path): path is string => Boolean(path),
			),
		);
		const urls = await signPaths(supabase, paths);

		return (rows as WallRow[]).map((row) => toCard(row, urls));
	});

export type WallCardsPage =
	| {
			ok: true;
			rows: WallCard[];
			total: number;
			nextOffset: number | null;
	  }
	| { ok: false; error: string };

/** Dashboard listing: guarded, paginated, and never dependent on the URL token. */
export const listWallCardsPage = createServerFn({ method: "GET" })
	.inputValidator((data: { offset?: number; limit?: number } | undefined) => ({
		offset: Math.max(0, Math.floor(Number(data?.offset ?? 0)) || 0),
		limit: Math.min(Math.max(Number(data?.limit ?? 24), 1), 60),
	}))
	.handler(async ({ data }): Promise<WallCardsPage> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
			};
		}

		let supabase: ReturnType<typeof getSupabaseAdmin>;
		try {
			supabase = getSupabaseAdmin();
		} catch (error) {
			return {
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Supabase belum dikonfigurasi.",
			};
		}

		const {
			data: rows,
			count,
			error,
		} = await supabase
			.from("wall_cards")
			.select(CARD_COLUMNS, { count: "exact" })
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.range(data.offset, data.offset + data.limit - 1);

		if (error) return { ok: false, error: error.message };

		const cards = (rows as WallRow[] | null) ?? [];
		const paths = cards.flatMap((row) =>
			[row.thumb_path, row.photo_path, row.audio_path].filter(
				(path): path is string => Boolean(path),
			),
		);
		const urls = await signPaths(supabase, paths);
		const total = count ?? cards.length;
		const nextOffset =
			data.offset + cards.length < total ? data.offset + cards.length : null;

		return {
			ok: true,
			rows: cards.map((row) => toCard(row, urls)),
			total,
			nextOffset,
		};
	});

/** Oldest cards beyond the cap are removed together with their files. */
async function pruneWall(supabase: ReturnType<typeof getSupabaseAdmin>) {
	const { data: stale, error } = await supabase
		.from("wall_cards")
		.select("id, thumb_path, photo_path, audio_path")
		.order("created_at", { ascending: false })
		.range(WALL_MAX_CARDS, WALL_MAX_CARDS + 99);

	if (error || !stale?.length) return;

	const paths = stale.flatMap((row) =>
		[row.thumb_path, row.photo_path, row.audio_path].filter(
			(path): path is string => Boolean(path),
		),
	);

	await supabase.storage.from(BUCKET).remove(paths);
	await supabase
		.from("wall_cards")
		.delete()
		.in(
			"id",
			stale.map((row) => row.id),
		);
}

export const publishWallCard = createServerFn({ method: "POST" })
	.inputValidator((data: WallPublishInput) => data)
	.handler(async ({ data }): Promise<PublishResult> => {
		const guest = await findGuest(data.slug);
		if (!guest) return { ok: false, error: "Tautan undangan tidak valid." };
		const guestName = guest.name;

		const validation = validateWallPublish(data);
		if (!validation.ok) {
			return { ok: false, error: WALL_ERROR_MESSAGES[validation.error] };
		}

		const supabase = getSupabaseAdmin();

		const since = new Date(Date.now() - WALL_RATE_WINDOW_MS).toISOString();
		const { count, error: countError } = await supabase
			.from("wall_cards")
			.select("id", { count: "exact", head: true })
			.eq("slug", data.slug)
			.gte("created_at", since);

		if (countError) throw new Error(countError.message);
		if ((count ?? 0) >= WALL_RATE_LIMIT) {
			return {
				ok: false,
				error:
					"Sudah cukup banyak kartu dari tautan ini. Coba lagi beberapa menit lagi.",
			};
		}

		const id = crypto.randomUUID();
		const photoPath = `${id}/card.jpg`;
		const thumbPath = `${id}/thumb.jpg`;
		const audioExt =
			validation.audio?.mime === "audio/mp4"
				? "m4a"
				: validation.audio?.mime === "audio/ogg"
					? "ogg"
					: "webm";
		const audioPath = validation.audio ? `${id}/voice.${audioExt}` : null;

		const uploaded: string[] = [];

		try {
			const uploads = [
				{ path: thumbPath, payload: validation.thumb },
				{ path: photoPath, payload: validation.photo },
			];
			if (validation.audio && audioPath) {
				uploads.push({ path: audioPath, payload: validation.audio });
			}

			for (const upload of uploads) {
				const { error } = await supabase.storage
					.from(BUCKET)
					.upload(upload.path, upload.payload.data, {
						contentType: upload.payload.mime,
						upsert: false,
					});
				if (error) throw new Error(error.message);
				uploaded.push(upload.path);
			}

			const { data: inserted, error: insertError } = await supabase
				.from("wall_cards")
				.insert({
					id,
					slug: data.slug,
					guest_name: guestName.slice(0, 60),
					message: validation.message || null,
					photo_path: photoPath,
					thumb_path: thumbPath,
					audio_path: audioPath,
					audio_duration_ms: validation.audioDurationMs ?? null,
				})
				.select(
					"id, guest_name, message, thumb_path, photo_path, audio_path, audio_duration_ms, created_at",
				)
				.single();

			if (insertError) throw new Error(insertError.message);

			const urls = await signPaths(supabase, [
				thumbPath,
				photoPath,
				...(audioPath ? [audioPath] : []),
			]);

			// Retention is best effort: a failure here must not lose the new card.
			await pruneWall(supabase).catch(() => undefined);

			return { ok: true, card: toCard(inserted as WallRow, urls) };
		} catch (error) {
			if (uploaded.length) {
				await supabase.storage
					.from(BUCKET)
					.remove(uploaded)
					.catch(() => undefined);
			}
			return {
				ok: false,
				error:
					error instanceof Error
						? `Gagal menyimpan kartu: ${error.message}`
						: "Gagal menyimpan kartu.",
			};
		}
	});

function tokensMatch(given: string, expected: string): boolean {
	// Hash both sides first so `timingSafeEqual` gets equal-length buffers and
	// the comparison does not leak the token length.
	const a = createHash("sha256").update(given).digest();
	const b = createHash("sha256").update(expected).digest();
	return timingSafeEqual(a, b);
}

/** Lets the wall decide whether to show the admin controls. */
export const verifyWallAdminToken = createServerFn({ method: "POST" })
	.inputValidator((data: { token: string }) => ({
		token: String(data?.token ?? ""),
	}))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const expected = process.env.WALL_ADMIN_TOKEN;
		if (!expected || !data.token) return { ok: false };
		return { ok: tokensMatch(data.token, expected) };
	});

export const deleteWallCard = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string; token: string }) => data)
	.handler(async ({ data }): Promise<DeleteResult> => {
		const expected = process.env.WALL_ADMIN_TOKEN;
		if (!expected)
			return { ok: false, error: "Token admin belum diset di server." };
		if (!tokensMatch(data.token, expected)) {
			return { ok: false, error: "Token tidak valid." };
		}

		return deleteCardById(data.id);
	});

/** Dashboard delete: guarded by the dashboard session instead of a URL token. */
export const deleteWallCardAsDashboard = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
	.handler(async ({ data }): Promise<DeleteResult> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk lagi.",
			};
		}
		if (!data.id) return { ok: false, error: "Kartu tidak ditemukan." };

		return deleteCardById(data.id);
	});

/** Shared by the token route and the dashboard: row + Storage files go together. */
async function deleteCardById(id: string): Promise<DeleteResult> {
	let supabase: ReturnType<typeof getSupabaseAdmin>;
	try {
		supabase = getSupabaseAdmin();
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error
					? error.message
					: "Supabase belum dikonfigurasi.",
		};
	}

	const { data: row, error } = await supabase
		.from("wall_cards")
		.select("id, thumb_path, photo_path, audio_path")
		.eq("id", id)
		.maybeSingle();

	if (error) return { ok: false, error: error.message };
	if (!row) return { ok: false, error: "Kartu tidak ditemukan." };

	const paths = [row.thumb_path, row.photo_path, row.audio_path].filter(
		(path): path is string => Boolean(path),
	);

	if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

	const { error: deleteError } = await supabase
		.from("wall_cards")
		.delete()
		.eq("id", id);

	if (deleteError) return { ok: false, error: deleteError.message };
	return { ok: true };
}
