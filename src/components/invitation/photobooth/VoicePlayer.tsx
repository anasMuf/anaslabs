import { useEffect, useRef, useState } from "react";
import { barsFromPeaks } from "#/lib/audio-peaks";
import { formatVoiceDuration } from "#/lib/invitation";

interface VoiceWaveformProps {
	peaks: number[];
	/** 0..1 of the way through the clip; bars before it are drawn as played. */
	progress: number;
}

/** Static waveform for the finished take, drawn on a canvas to keep the DOM flat. */
function VoiceWaveform({ peaks, progress }: VoiceWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;

		const styles = getComputedStyle(canvas);
		const played = styles.getPropertyValue("--wave-played").trim() || "#7b2438";
		const rest = styles.getPropertyValue("--wave-rest").trim() || "#d6c4bc";

		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const rect = canvas.getBoundingClientRect();
		canvas.width = Math.max(1, Math.round(rect.width * ratio));
		canvas.height = Math.max(1, Math.round(rect.height * ratio));

		const { width, height } = canvas;
		context.clearRect(0, 0, width, height);

		const count = Math.max(1, peaks.length);
		const gap = 2 * ratio;
		const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
		const playedBars = Math.round(progress * count);

		peaks.forEach((peak, index) => {
			const barHeight = Math.max(3 * ratio, peak * height);
			context.fillStyle = index < playedBars ? played : rest;
			context.beginPath();
			context.roundRect(
				index * (barWidth + gap),
				(height - barHeight) / 2,
				barWidth,
				barHeight,
				barWidth / 2,
			);
			context.fill();
		});
	}, [peaks, progress]);

	return (
		<canvas
			ref={canvasRef}
			className="h-8 w-full [--wave-played:#7b2438] [--wave-rest:#d6c4bc]"
		/>
	);
}

interface VoicePlayerProps {
	src: string;
	peaks: number[];
	durationMs: number;
}

/**
 * Custom player for the guest's own voice note: a play button plus a static
 * waveform that doubles as a seek bar.
 *
 * A hidden `<audio>` element still does the playback so behaviour (pause,
 * looping, iOS quirks) matches the browser instead of re-implementing it with
 * Web Audio; the visible controls are ours.
 */
export default function VoicePlayer({
	src,
	peaks,
	durationMs,
}: VoicePlayerProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [current, setCurrent] = useState(0);
	const [duration, setDuration] = useState(durationMs / 1000);

	const bars = barsFromPeaks(peaks);
	const fmt = (seconds: number) =>
		formatVoiceDuration(seconds * 1000) ?? "0:00";
	const progress = duration > 0 ? Math.min(1, current / duration) : 0;

	const toggle = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) void audio.play().catch(() => setPlaying(false));
		else audio.pause();
	};

	const seekToRatio = (ratio: number) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration)) return;
		const clamped = Math.min(1, Math.max(0, ratio));
		audio.currentTime = clamped * audio.duration;
		setCurrent(audio.currentTime);
	};

	return (
		<div className="flex items-center gap-3 rounded-full border border-inv-rule bg-inv-card px-3 py-2">
			<button
				type="button"
				onClick={toggle}
				aria-label={playing ? "Jeda rekaman" : "Putar rekaman"}
				className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-inv-accent text-inv-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				{playing ? (
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						aria-hidden="true"
						fill="currentColor"
					>
						<path d="M7 5h4v14H7zM13 5h4v14h-4z" />
					</svg>
				) : (
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						aria-hidden="true"
						fill="currentColor"
					>
						<path d="M8 5l11 7-11 7z" />
					</svg>
				)}
			</button>

			<div
				role="slider"
				tabIndex={0}
				aria-label="Posisi pemutaran rekaman"
				aria-valuemin={0}
				aria-valuemax={Math.max(1, Math.round(duration))}
				aria-valuenow={Math.round(current)}
				aria-valuetext={`${fmt(current)} dari ${fmt(duration)}`}
				onClick={(event) => {
					const rect = event.currentTarget.getBoundingClientRect();
					seekToRatio((event.clientX - rect.left) / rect.width);
				}}
				onKeyDown={(event) => {
					if (event.key === "ArrowRight") {
						event.preventDefault();
						seekToRatio((current + 5) / (duration || 1));
					} else if (event.key === "ArrowLeft") {
						event.preventDefault();
						seekToRatio((current - 5) / (duration || 1));
					} else if (event.key === " " || event.key === "Enter") {
						event.preventDefault();
						toggle();
					}
				}}
				className="flex h-10 flex-1 cursor-pointer items-center rounded-full px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				<VoiceWaveform peaks={bars} progress={progress} />
			</div>

			<span className="shrink-0 font-body text-[10px] tabular-nums text-inv-muted">
				{fmt(playing || current > 0 ? current : duration)}
			</span>

			{/* biome-ignore lint/a11y/useMediaCaption: rekaman tamu, tidak ada transkrip */}
			<audio
				ref={audioRef}
				src={src}
				preload="metadata"
				className="hidden"
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => {
					setPlaying(false);
					setCurrent(0);
				}}
				onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
				onLoadedMetadata={(event) => {
					const value = event.currentTarget.duration;
					if (Number.isFinite(value) && value > 0) setDuration(value);
				}}
			/>
		</div>
	);
}
