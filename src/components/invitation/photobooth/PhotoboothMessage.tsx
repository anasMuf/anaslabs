import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formatVoiceDuration } from "#/lib/invitation";
import type { WallImages } from "#/lib/photobooth/wall-export";
import { useVoiceRecorder, VOICE_MAX_MS } from "#/lib/use-voice-recorder";
import { publishWallCard } from "#/lib/wall";
import { WALL_MESSAGE_MAX } from "#/lib/wall-validation";
import VoicePlayer from "../ui/VoicePlayer";
import VoiceMeter from "./VoiceMeter";

interface PhotoboothMessageProps {
	slug: string;
	images: WallImages;
	onBack: () => void;
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

/**
 * Step between the result card and the wall: the guest adds a message and/or a
 * voice note, which is what makes the wall read like a guestbook.
 */
export default function PhotoboothMessage({
	slug,
	images,
	onBack,
}: PhotoboothMessageProps) {
	const navigate = useNavigate();
	const voice = useVoiceRecorder(VOICE_MAX_MS);
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const trimmed = message.trim();
	const canSend = (trimmed.length > 0 || Boolean(voice.blob)) && !sending;
	const elapsed = formatVoiceDuration(voice.durationMs) ?? "0:00";

	async function handleSend() {
		if (!canSend) return;

		setSending(true);
		setError(null);

		try {
			const audio = voice.blob ? await blobToDataUrl(voice.blob) : undefined;
			const result = await publishWallCard({
				data: {
					slug,
					message,
					photo: images.photo,
					thumb: images.thumb,
					audio,
					audioDurationMs: audio ? Math.round(voice.durationMs) : undefined,
				},
			});

			if (!result.ok) {
				setError(result.error);
				return;
			}

			// The wall reads this to highlight the card that was just published.
			sessionStorage.setItem("wall:new-card", result.card.id);
			await navigate({
				to: "/invitation/$slug/wall",
				params: { slug },
				replace: true,
			});
		} catch {
			setError("Gagal mengirim kartu. Periksa koneksi lalu coba lagi.");
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="flex min-h-dvh touch-pan-y flex-col bg-inv-bg text-inv-ink">
			<header className="px-6 pt-5">
				<button
					type="button"
					onClick={onBack}
					disabled={sending}
					className="-ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-[12px] text-inv-muted transition-colors hover:text-inv-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						aria-hidden="true"
						focusable="false"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M15 6l-6 6 6 6" />
					</svg>
					Kembali ke hasil
				</button>
			</header>

			<main className="flex-1 overflow-y-auto px-6 pb-4 pt-2">
				<h1 className="text-center font-display text-[26px] leading-tight">
					Ucapan untuk Mempelai
				</h1>
				<p className="mx-auto mt-2 max-w-[280px] text-center font-body text-[12px] leading-[1.7] text-inv-muted">
					Tulis beberapa kata, rekam suara, atau keduanya.
				</p>

				<img
					src={images.thumb}
					alt="Pratinjau kartu photobooth"
					width={320}
					height={487}
					className="mx-auto mt-5 h-auto max-h-[26vh] w-auto rounded-[10px] shadow-[0_10px_30px_rgba(52,54,46,0.12)]"
				/>

				<div className="mt-5">
					<label
						htmlFor="wall-message"
						className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent"
					>
						UCAPAN
					</label>
					<textarea
						id="wall-message"
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						maxLength={WALL_MESSAGE_MAX}
						rows={3}
						placeholder="Selamat ya, semoga bahagia selalu…"
						className="mt-2 w-full resize-none rounded-2xl border border-inv-rule bg-inv-card px-4 py-3 font-body text-[13px] leading-[1.6] text-inv-ink placeholder:text-inv-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					/>
					<p className="mt-1 text-right font-body text-[10px] text-inv-muted">
						{message.length}/{WALL_MESSAGE_MAX}
					</p>
				</div>

				<div className="mt-3">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						UCAPAN SUARA
					</p>

					{!voice.supported ? (
						<p className="mt-2 font-body text-[11px] leading-relaxed text-inv-muted">
							Browser ini belum mendukung perekaman suara.
						</p>
					) : voice.status === "idle" || voice.status === "requesting" ? (
						<div className="mt-2 flex items-center gap-3">
							<button
								type="button"
								onClick={() => void voice.start()}
								disabled={voice.status === "requesting" || sending}
								aria-label={
									voice.status === "requesting"
										? "Meminta izin mikrofon"
										: "Rekam ucapan"
								}
								className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-inv-accent text-inv-bg shadow-[0_6px_18px_rgba(123,36,56,0.25)] transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									aria-hidden="true"
									focusable="false"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.7"
									strokeLinecap="round"
								>
									<rect x="9" y="3" width="6" height="11" rx="3" />
									<path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
								</svg>
							</button>
							<p className="font-body text-[11px] leading-[1.6] text-inv-muted">
								{voice.status === "requesting"
									? "Menunggu izin mikrofon…"
									: "Rekam sampai 60 detik. Suara ini akan muncul di wall."}
							</p>
						</div>
					) : voice.status === "recording" ? (
						<div className="mt-2 rounded-3xl border border-inv-accent/25 bg-inv-card px-4 py-3">
							<div className="flex items-center justify-between gap-3">
								<span className="flex items-center gap-2 font-body text-[11px] font-semibold tracking-[0.1em] text-inv-accent">
									<span
										aria-hidden="true"
										className="h-2 w-2 animate-pulse rounded-full bg-inv-accent"
									/>
									MEREKAM
								</span>
								<span className="font-body text-[12px] tabular-nums text-inv-ink">
									{elapsed} / 1:00
								</span>
							</div>

							<VoiceMeter analyser={voice.analyser} />

							<button
								type="button"
								onClick={voice.stop}
								className="flex w-full items-center justify-center gap-2 rounded-full bg-inv-ink px-4 py-3 font-body text-[12px] text-inv-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									aria-hidden="true"
									fill="currentColor"
								>
									<rect x="6" y="6" width="12" height="12" rx="1.5" />
								</svg>
								Selesai
							</button>
						</div>
					) : (
						<div className="mt-2">
							{voice.previewUrl ? (
								<VoicePlayer
									key={voice.previewUrl}
									src={voice.previewUrl}
									peaks={voice.peaks}
									durationMs={voice.durationMs}
								/>
							) : null}

							<div className="mt-1 flex items-center gap-4">
								<button
									type="button"
									onClick={() => void voice.start()}
									disabled={sending}
									className="inline-flex min-h-[44px] items-center px-1 font-body text-[11px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
								>
									Rekam ulang
								</button>
								<button
									type="button"
									onClick={voice.reset}
									disabled={sending}
									className="inline-flex min-h-[44px] items-center px-1 font-body text-[11px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
								>
									Hapus rekaman
								</button>
							</div>
						</div>
					)}

					{voice.error ? (
						<p className="mt-2 font-body text-[11px] text-inv-accent">
							{voice.error}
						</p>
					) : null}
				</div>
			</main>

			<footer className="px-6 pb-8 pt-2">
				{error ? (
					<p
						role="alert"
						className="mb-2 rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 text-center font-body text-[11px] leading-relaxed text-inv-accent"
					>
						{error}
					</p>
				) : null}

				<button
					type="button"
					onClick={() => void handleSend()}
					disabled={!canSend}
					className="flex w-full items-center justify-center gap-2 rounded-full bg-inv-accent px-5 py-3.5 font-body text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					{sending ? "Mengirim…" : "Kirim ke Wall"}
				</button>
			</footer>
		</div>
	);
}
