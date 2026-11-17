import { useEffect, useRef } from "react";
import { formatVoiceDuration } from "#/lib/invitation";
import { useAudioPeaks } from "#/lib/use-audio-peaks";
import type { WallCard } from "#/lib/wall";
import VoicePlayer from "../ui/VoicePlayer";

interface WallDialogProps {
	card: WallCard;
	onClose: () => void;
}

/** Full-size card: photo, whole message and the voice note if there is one. */
export default function WallDialog({ card, onClose }: WallDialogProps) {
	const closeRef = useRef<HTMLButtonElement | null>(null);
	const duration = formatVoiceDuration(card.audioDurationMs);
	const peaks = useAudioPeaks(card.audioUrl);

	useEffect(() => {
		closeRef.current?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				tabIndex={-1}
				aria-label="Tutup"
				onClick={onClose}
				className="absolute inset-0 h-full w-full cursor-default bg-inv-ink/70 backdrop-blur-sm"
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-label={`Kartu dari ${card.guestName}`}
				className="relative z-10 max-h-full w-full max-w-[360px] overflow-y-auto rounded-3xl bg-inv-bg p-3 shadow-xl"
			>
				<div className="relative">
					<img
						src={card.photoUrl || card.thumbUrl}
						alt={`Potret dari ${card.guestName}`}
						width={348}
						height={530}
						className="block h-auto w-full rounded-2xl bg-inv-rule/25"
					/>
					<button
						ref={closeRef}
						type="button"
						onClick={onClose}
						aria-label="Tutup"
						className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-inv-bg/85 text-inv-ink backdrop-blur transition-colors hover:bg-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
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
						>
							<path d="M6 6l12 12M18 6L6 18" />
						</svg>
					</button>
				</div>

				<div className="px-2 pb-2 pt-4">
					<p className="font-body text-[13px] font-semibold text-inv-ink">
						{card.guestName}
					</p>

					{card.message ? (
						<p className="mt-2 font-body text-[12px] leading-[1.7] text-inv-muted">
							{card.message}
						</p>
					) : null}

					{card.audioUrl ? (
						<div className="mt-4">
							<p className="font-body text-[10px] font-semibold tracking-[0.12em] text-inv-accent">
								UCAPAN SUARA{duration ? ` · ${duration}` : ""}
							</p>
							<div className="mt-2">
								<VoicePlayer
									src={card.audioUrl}
									peaks={peaks}
									durationMs={card.audioDurationMs ?? 0}
								/>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
