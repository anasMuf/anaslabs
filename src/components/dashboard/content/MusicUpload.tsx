import { useState } from "react";
import { getDashboardAuthConfig } from "#/lib/dashboard-auth";
import { createMusicUploadUrl } from "#/lib/invitation-content";
import {
	MUSIC_BUCKET,
	MUSIC_MAX_BYTES,
	validateMusicUpload,
} from "#/lib/invitation-upload";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

/**
 * Uploads one audio file through a server-signed URL.
 *
 * The editor never receives the service key: the server validates the file and
 * signs a single path, then the browser uploads directly to Supabase Storage.
 */
export default function MusicUpload({
	onUploaded,
}: {
	onUploaded: (url: string) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleFile(file: File) {
		const validation = validateMusicUpload({
			mime: file.type,
			size: file.size,
		});
		if (!validation.ok) {
			setError(validation.error);
			return;
		}

		setBusy(true);
		setError(null);

		try {
			const target = await createMusicUploadUrl({
				data: { mime: file.type, size: file.size },
			});
			if (!target.ok) {
				setError(target.error);
				return;
			}

			const config = await getDashboardAuthConfig();
			if (!config) {
				setError("Supabase belum dikonfigurasi di server.");
				return;
			}

			const supabase = createSupabaseBrowser(config);
			const { error: uploadError } = await supabase.storage
				.from(MUSIC_BUCKET)
				.uploadToSignedUrl(target.path, target.token, file, {
					contentType: validation.mime,
				});

			if (uploadError) {
				setError(uploadError.message);
				return;
			}

			onUploaded(target.publicUrl);
		} catch {
			setError("Gagal mengunggah audio. Coba lagi.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div>
			<label
				className={`inline-flex items-center rounded-full border border-inv-ink/25 px-4 py-2 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 ${
					busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"
				}`}
			>
				<input
					type="file"
					accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
					disabled={busy}
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) void handleFile(file);
					}}
					className="sr-only"
				/>
				{busy ? "Mengunggah…" : "Upload audio"}
			</label>
			<p className="mt-1 font-body text-[10px] leading-[1.5] text-inv-muted">
				MP3, M4A, OGG, atau WAV · maksimal {MUSIC_MAX_BYTES / (1024 * 1024)} MB.
			</p>
			{error ? (
				<p
					role="alert"
					className="mt-1 font-body text-[10px] leading-[1.5] text-inv-accent"
				>
					{error}
				</p>
			) : null}
		</div>
	);
}
