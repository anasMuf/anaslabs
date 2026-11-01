import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface InvitationAudioProps {
	url?: string | null;
}

/**
 * Background music for the invitation.
 *
 * Tries to autoplay on mount. Browsers block audio-with-sound autoplay until
 * the user has interacted with the page, so on failure we attach a one-shot
 * gesture listener (pointerdown/keydown) that starts playback on the very next
 * interaction. The floating button always provides a mute/unmute control.
 */
export default function InvitationAudio({ url }: InvitationAudioProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		if (!url) return;
		const audio = audioRef.current;
		if (!audio) return;

		let cancelled = false;

		const tryPlay = async () => {
			try {
				await audio.play();
				if (!cancelled) setPlaying(true);
			} catch {
				// Autoplay blocked — will be retried on the first user gesture.
			}
		};

		const handleFirstGesture = () => {
			if (audio.paused) void tryPlay();
		};

		void tryPlay();

		document.addEventListener("pointerdown", handleFirstGesture, {
			once: true,
		});
		document.addEventListener("keydown", handleFirstGesture, { once: true });

		return () => {
			cancelled = true;
			document.removeEventListener("pointerdown", handleFirstGesture);
			document.removeEventListener("keydown", handleFirstGesture);
		};
	}, [url]);

	if (!url) return null;

	const handleToggle = async () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
			setPlaying(false);
			return;
		}
		try {
			await audio.play();
			setPlaying(true);
		} catch {
			// Playback can still be blocked; the next tap retries.
		}
	};

	return (
		<>
			{/* biome-ignore lint/a11y/useMediaCaption: background music loop, there is no speech to caption. */}
			<audio
				ref={audioRef}
				src={url}
				loop
				preload="auto"
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
			/>
			<button
				type="button"
				onClick={() => void handleToggle()}
				aria-label={playing ? "Matikan musik" : "Putar musik"}
				aria-pressed={playing}
				className="fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-inv-accent text-inv-bg shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				{playing ? (
					<Volume2 className="h-5 w-5" />
				) : (
					<VolumeX className="h-5 w-5" />
				)}
			</button>
		</>
	);
}
