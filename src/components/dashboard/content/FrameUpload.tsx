import { useState } from "react";
import { getDashboardAuthConfig } from "#/lib/dashboard-auth";
import { createFrameUploadUrl } from "#/lib/invitation-content";
import {
	FRAME_BUCKET,
	FRAME_MAX_BYTES,
	validateFrameUpload,
} from "#/lib/invitation-upload";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

/** Uploads one transparent frame through a signed, server-validated URL. */
export default function FrameUpload({
	onUploaded,
	label = "Upload overlay PNG",
	allowJpeg = false,
}: {
	onUploaded: (url: string) => void;
	label?: string;
	allowJpeg?: boolean;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleFile(file: File) {
		const validation = validateFrameUpload({
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
			const target = await createFrameUploadUrl({
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
				.from(FRAME_BUCKET)
				.uploadToSignedUrl(target.path, target.token, file, {
					contentType: validation.mime,
				});

			if (uploadError) {
				setError(uploadError.message);
				return;
			}

			onUploaded(target.publicUrl);
		} catch {
			setError("Gagal mengunggah frame. Coba lagi.");
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
					accept={
						allowJpeg
							? "image/png,image/webp,image/jpeg"
							: "image/png,image/webp"
					}
					disabled={busy}
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) void handleFile(file);
					}}
					className="sr-only"
				/>
				{busy ? "Mengunggah…" : label}
			</label>
			<p className="mt-1 font-body text-[10px] leading-[1.5] text-inv-muted">
				{allowJpeg ? "PNG/JPEG/WebP" : "PNG/WebP transparan"} · maksimal{" "}
				{FRAME_MAX_BYTES / (1024 * 1024)} MB.
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
