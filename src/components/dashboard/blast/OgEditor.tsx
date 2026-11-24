import { useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	bumpOgVersion,
	createOgUploadUrl,
	type InvitationMetaView,
	saveInvitationMeta,
	saveOgImage,
} from "#/lib/blast/og";
import { getDashboardAuthConfig } from "#/lib/dashboard-auth";
import {
	MUSIC_BUCKET,
	OG_MAX_BYTES,
	validateOgUpload,
} from "#/lib/invitation-upload";
import { SITE_URL } from "#/lib/site";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

const inputClass =
	"w-full rounded-2xl border border-inv-rule bg-inv-bg px-4 py-2.5 font-body text-[11px] leading-relaxed text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";

const labelClass =
	"font-body text-[10px] font-semibold tracking-[0.14em] text-inv-muted";

export function OgEditor({ meta }: { meta: InvitationMetaView }) {
	const toast = useToast();
	const [title, setTitle] = useState(meta.title ?? "");
	const [description, setDescription] = useState(meta.description ?? "");
	const [imageUrl, setImageUrl] = useState(meta.imageUrl ?? "");
	const [busy, setBusy] = useState<"text" | "image" | "remove" | "bump" | null>(
		null,
	);

	async function handleUpload(file: File) {
		const validation = validateOgUpload({
			mime: file.type,
			size: file.size,
		});
		if (!validation.ok) {
			toast({ message: validation.error });
			return;
		}

		setBusy("image");
		try {
			const target = await createOgUploadUrl({
				data: { mime: file.type, size: file.size },
			});
			if (!target.ok) {
				toast({ message: target.error });
				return;
			}

			const config = await getDashboardAuthConfig();
			if (!config) {
				toast({ message: "Supabase belum dikonfigurasi di server." });
				return;
			}

			const supabase = createSupabaseBrowser(config);
			const { error: uploadError } = await supabase.storage
				.from(MUSIC_BUCKET)
				.uploadToSignedUrl(target.path, target.token, file, {
					contentType: validation.mime,
				});
			if (uploadError) {
				toast({ message: uploadError.message });
				return;
			}

			const saved = await saveOgImage({ data: { imageUrl: target.publicUrl } });
			if (!saved.ok) {
				toast({ message: saved.error });
				return;
			}

			setImageUrl(target.publicUrl);
			toast({ tone: "success", message: "Gambar OG diperbarui." });
		} catch {
			toast({ message: "Gagal mengunggah gambar OG. Coba lagi." });
		} finally {
			setBusy(null);
		}
	}

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		setBusy("text");
		try {
			const result = await saveInvitationMeta({ data: { title, description } });
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({ tone: "success", message: "Metadata OG disimpan." });
		} catch {
			toast({ message: "Gagal menyimpan metadata OG." });
		} finally {
			setBusy(null);
		}
	}

	async function handleRemoveImage() {
		setBusy("remove");
		try {
			const result = await saveOgImage({ data: { imageUrl: null } });
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			setImageUrl("");
			toast({
				tone: "success",
				message: "Gambar OG dihapus; memakai gambar default.",
			});
		} catch {
			toast({ message: "Gagal menghapus gambar OG." });
		} finally {
			setBusy(null);
		}
	}

	async function handleBump() {
		setBusy("bump");
		try {
			const result = await bumpOgVersion();
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({
				tone: "success",
				message:
					"Versi link diperbarui. Link baru akan memakai ?v=… dan memuat ulang halaman…",
			});
			window.location.reload();
		} catch {
			toast({ message: "Gagal menyegarkan versi link." });
		} finally {
			setBusy(null);
		}
	}

	async function copyTestUrl() {
		try {
			await navigator.clipboard.writeText(`${SITE_URL}/invitation/test`);
			toast({ tone: "success", message: "URL uji disalin." });
		} catch {
			toast({ message: "Gagal menyalin URL uji." });
		}
	}

	const previewTitle = title.trim() || "Judul undangan akan tampil di sini";
	const previewDescription =
		description.trim() ||
		"Deskripsi singkat yang tampil saat tautan undangan dibagikan.";

	return (
		<div className="flex flex-col gap-4">
			<form
				onSubmit={handleSave}
				className="flex flex-col gap-3 rounded-3xl border border-inv-rule bg-inv-card px-5 py-4"
			>
				<label className="flex flex-col gap-1">
					<span className={labelClass}>JUDUL OG</span>
					<input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						maxLength={120}
						placeholder="Kosongkan untuk memakai default undangan"
						className={inputClass}
					/>
				</label>

				<label className="flex flex-col gap-1">
					<span className={labelClass}>DESKRIPSI OG</span>
					<textarea
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						maxLength={300}
						rows={3}
						placeholder="Kosongkan untuk memakai default undangan"
						className={`${inputClass} resize-y`}
					/>
				</label>

				<div>
					<span className={labelClass}>GAMBAR OG (1200 × 630)</span>
					<div className="mt-1 flex flex-wrap items-center gap-2">
						<label className="inline-flex cursor-pointer items-center rounded-full border border-inv-ink/25 px-4 py-2 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5">
							<input
								type="file"
								accept="image/png,image/webp,image/jpeg"
								disabled={busy !== null}
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (file) void handleUpload(file);
								}}
								className="sr-only"
							/>
							{busy === "image" ? "Mengunggah…" : "Unggah gambar"}
						</label>
						{imageUrl ? (
							<button
								type="button"
								onClick={() => void handleRemoveImage()}
								disabled={busy !== null}
								className="rounded-full px-3 py-2 font-body text-[11px] text-inv-accent underline-offset-2 transition-colors hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								{busy === "remove" ? "Menghapus…" : "Hapus gambar"}
							</button>
						) : null}
						<span className="font-body text-[10px] text-inv-muted">
							PNG/JPEG/WebP · maks {OG_MAX_BYTES / (1024 * 1024)} MB
						</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						disabled={busy !== null}
						className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "text" ? "Menyimpan…" : "Simpan teks"}
					</button>
					<button
						type="button"
						onClick={() => void copyTestUrl()}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Salin URL uji
					</button>
					<button
						type="button"
						onClick={() => void handleBump()}
						disabled={busy !== null}
						className="rounded-full border border-inv-rule px-4 py-2.5 font-body text-[11px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "bump" ? "Menyegarkan…" : "Segarkan preview WhatsApp"}
					</button>
				</div>
			</form>

			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					PRATINJAU KARTU
				</p>
				<div className="mt-2 overflow-hidden rounded-2xl border border-inv-rule">
					{imageUrl ? (
						<img
							src={imageUrl}
							alt="Pratinjau gambar Open Graph"
							className="aspect-[1200/630] w-full object-cover"
						/>
					) : (
						<div className="flex aspect-[1200/630] w-full items-center justify-center bg-inv-ink/5 font-body text-[11px] text-inv-muted">
							Gambar default (og-card.jpg)
						</div>
					)}
					<div className="bg-inv-bg px-4 py-3">
						<p className="font-body text-[10px] uppercase tracking-[0.12em] text-inv-muted">
							{new URL(SITE_URL).host}
						</p>
						<p className="mt-1 font-body text-[12px] font-semibold leading-snug text-inv-ink">
							{previewTitle}
						</p>
						<p className="mt-0.5 line-clamp-2 font-body text-[10.5px] leading-relaxed text-inv-muted">
							{previewDescription}
						</p>
					</div>
				</div>
				<p className="mt-2 font-body text-[10px] leading-relaxed text-inv-muted">
					WhatsApp mengambil gambar dari tag og:image. Setelah menyimpan, uji
					tautan di WhatsApp atau Facebook Sharing Debugger.
				</p>
			</div>
		</div>
	);
}
