/**
 * Music upload rules.
 *
 * Pure so the server function and the editor can share one decision about what
 * counts as an acceptable audio file. Object paths are generated server-side so
 * a client cannot choose (or traverse) a storage path.
 */

export const MUSIC_BUCKET = "invitation-media";
export const MUSIC_MAX_BYTES = 15 * 1024 * 1024;

export const MUSIC_MIME_EXTENSIONS = {
	"audio/mpeg": "mp3",
	"audio/mp4": "m4a",
	"audio/ogg": "ogg",
	"audio/wav": "wav",
} as const;

export type MusicMime = keyof typeof MUSIC_MIME_EXTENSIONS;

export type MusicUploadValidation =
	| { ok: true; mime: MusicMime; ext: string; size: number }
	| { ok: false; error: string };

export function validateMusicUpload(input: {
	mime?: string | null;
	size?: number | null;
}): MusicUploadValidation {
	const mime = (input.mime ?? "").trim().toLowerCase();
	const ext = MUSIC_MIME_EXTENSIONS[mime as MusicMime];

	if (!ext) {
		return {
			ok: false,
			error: "Format audio harus MP3, M4A, OGG, atau WAV.",
		};
	}

	const size = Number(input.size ?? 0);
	if (!Number.isFinite(size) || size <= 0) {
		return { ok: false, error: "Ukuran file audio tidak valid." };
	}

	if (size > MUSIC_MAX_BYTES) {
		return {
			ok: false,
			error: `Ukuran audio maksimal ${MUSIC_MAX_BYTES / (1024 * 1024)} MB.`,
		};
	}

	return { ok: true, mime: mime as MusicMime, ext, size };
}

const SAFE_EXT = /^[a-z0-9]{2,5}$/;
const SAFE_ID = /^[a-zA-Z0-9-]{8,64}$/;

/** `music/<uuid>.<ext>` — the bucket stays flat and unguessable. */
export function musicObjectPath(ext: string, id: string): string {
	const safeExt = ext.trim().toLowerCase();

	if (!SAFE_EXT.test(safeExt)) {
		throw new Error("Ekstensi audio tidak valid.");
	}
	if (!SAFE_ID.test(id)) {
		throw new Error("ID file audio tidak valid.");
	}

	return `music/${id}.${safeExt}`;
}
