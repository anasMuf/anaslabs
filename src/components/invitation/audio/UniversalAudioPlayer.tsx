import { useEffect, useRef, useState } from "react";
import { getAudioSource } from "./audio-source";

/**
 * Background audio for the invitation.
 *
 * Direct files use a hidden `<audio>` element. YouTube links use the iframe API
 * in a hidden 1×1 player, loaded only after the guest has interacted with the
 * page (privacy and performance). If the browser blocks `play()`, a one-shot
 * pointer listener retries on the next tap.
 */

interface UniversalAudioPlayerProps {
	url: string;
	enabled: boolean;
	isPlaying: boolean;
	/** False until the guest's first gesture; YouTube is not loaded before that. */
	isOpened: boolean;
}

interface YouTubePlayer {
	playVideo: () => void;
	pauseVideo: () => void;
	unMute: () => void;
	setVolume: (volume: number) => void;
	destroy: () => void;
}

declare global {
	interface Window {
		YT?: {
			Player: new (
				element: HTMLElement,
				options: Record<string, unknown>,
			) => YouTubePlayer;
		};
		onYouTubeIframeAPIReady?: () => void;
		webkitAudioContext?: typeof AudioContext;
	}
}

let audioContext: AudioContext | null = null;

function unlockAudioSession() {
	const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
	if (!AudioCtor) return;
	if (!audioContext) audioContext = new AudioCtor();
	void audioContext.resume();
}

const YOUTUBE_SCRIPT = "https://www.youtube.com/iframe_api";
const ENDED = 0;

export default function UniversalAudioPlayer({
	url,
	enabled,
	isPlaying,
	isOpened,
}: UniversalAudioPlayerProps) {
	const source = getAudioSource(url);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const ytContainerRef = useRef<HTMLDivElement | null>(null);
	const ytPlayerRef = useRef<YouTubePlayer | null>(null);
	const mountedRef = useRef(true);
	const [ytReady, setYtReady] = useState(false);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	// Direct files: play while the guest wants music, pause otherwise. A blocked
	// autoplay is retried once on the next pointer gesture.
	useEffect(() => {
		if (source.type !== "direct") return;
		const audio = audioRef.current;
		if (!audio) return;

		if (!enabled || !isOpened || !isPlaying) {
			audio.pause();
			return;
		}

		let cancelled = false;
		let retry: (() => void) | null = null;

		const clearRetry = () => {
			if (!retry) return;
			document.removeEventListener("pointerdown", retry, true);
			retry = null;
		};

		const play = () => {
			unlockAudioSession();
			const promise = audio.play();
			if (!promise) return;

			promise.then(clearRetry).catch(() => {
				if (cancelled || retry) return;
				retry = () => {
					retry = null;
					play();
				};
				document.addEventListener("pointerdown", retry, {
					once: true,
					capture: true,
				});
			});
		};

		play();

		return () => {
			cancelled = true;
			clearRetry();
		};
	}, [enabled, isOpened, isPlaying, source.type]);

	// YouTube: create the hidden player only after the first gesture, and tear it
	// down when the track changes or the invitation unmounts.
	useEffect(() => {
		if (!enabled || !isOpened || source.type !== "youtube" || !source.id) {
			const player = ytPlayerRef.current;
			ytPlayerRef.current = null;
			setYtReady(false);
			if (player) {
				try {
					player.destroy();
				} catch {
					// Already detached; nothing to do.
				}
			}
			return;
		}

		const container = ytContainerRef.current;
		if (!container) return;

		let cancelled = false;
		const videoId = source.id;
		const previousHandler = window.onYouTubeIframeAPIReady;

		const init = () => {
			if (cancelled || !window.YT?.Player) return;

			ytPlayerRef.current = new window.YT.Player(container, {
				height: "1",
				width: "1",
				videoId,
				playerVars: {
					autoplay: 0,
					controls: 0,
					loop: 1,
					playlist: videoId,
					mute: 0,
					playsinline: 1,
					modestbranding: 1,
					origin: window.location.origin,
				},
				events: {
					onReady: () => {
						if (mountedRef.current) setYtReady(true);
					},
					onStateChange: (event: { data: number }) => {
						if (event.data === ENDED) ytPlayerRef.current?.playVideo();
					},
				},
			});
		};

		if (window.YT?.Player) {
			init();
		} else {
			if (!document.querySelector(`script[src="${YOUTUBE_SCRIPT}"]`)) {
				const script = document.createElement("script");
				script.src = YOUTUBE_SCRIPT;
				document.head.appendChild(script);
			}

			window.onYouTubeIframeAPIReady = () => {
				previousHandler?.();
				if (!cancelled) init();
			};
		}

		return () => {
			cancelled = true;
			setYtReady(false);
			window.onYouTubeIframeAPIReady = previousHandler;
			const player = ytPlayerRef.current;
			ytPlayerRef.current = null;
			if (player) {
				try {
					player.destroy();
				} catch {
					// The iframe may already be gone (StrictMode remount).
				}
			}
		};
	}, [enabled, isOpened, source.type, source.id]);

	// Keep the YouTube player in sync with the controller once it is ready.
	useEffect(() => {
		const player = ytPlayerRef.current;
		if (!player || !ytReady) return;

		unlockAudioSession();

		try {
			if (enabled && isOpened && isPlaying) {
				player.unMute();
				player.setVolume(100);
				player.playVideo();
			} else {
				player.pauseVideo();
			}
		} catch {
			// The player can be between states right after creation; the next
			// controller click retries.
		}
	}, [enabled, isOpened, isPlaying, ytReady]);

	if (!enabled || source.type === "unknown") return null;

	return (
		<div
			className="fixed z-[-1] h-px w-px overflow-hidden opacity-0"
			style={{ pointerEvents: "none" }}
			aria-hidden="true"
		>
			{source.type === "direct" ? (
				// biome-ignore lint/a11y/useMediaCaption: background music loop, there is no speech to caption.
				<audio
					ref={audioRef}
					src={source.url}
					loop
					preload="auto"
					playsInline
				/>
			) : (
				<div ref={ytContainerRef} key={source.id ?? "youtube"} />
			)}
		</div>
	);
}
