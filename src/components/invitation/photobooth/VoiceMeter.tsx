import { useEffect, useRef } from "react";

interface VoiceMeterProps {
	analyser: AnalyserNode | null;
}

const BARS = 44;

/**
 * Live spectrum while recording.
 *
 * Drawn on a canvas and driven by `requestAnimationFrame` instead of React
 * state: a 60fps meter should not re-render the form around it.
 */
export default function VoiceMeter({ analyser }: VoiceMeterProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;

		const levels = new Array(BARS).fill(0);
		const samples = analyser ? new Uint8Array(analyser.fftSize) : null;
		const accent =
			getComputedStyle(canvas).getPropertyValue("--meter-color").trim() ||
			"#7b2438";

		let frame = 0;
		let ratio = 1;

		const resize = () => {
			ratio = Math.min(window.devicePixelRatio || 1, 2);
			const rect = canvas.getBoundingClientRect();
			canvas.width = Math.max(1, Math.round(rect.width * ratio));
			canvas.height = Math.max(1, Math.round(rect.height * ratio));
		};
		resize();

		const observer =
			typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
		observer?.observe(canvas);

		const draw = () => {
			const width = canvas.width;
			const height = canvas.height;

			let level = 0;
			if (analyser && samples) {
				analyser.getByteTimeDomainData(samples);
				let sum = 0;
				for (const sample of samples) {
					const value = (sample - 128) / 128;
					sum += value * value;
				}
				level = Math.min(1, Math.sqrt(sum / samples.length) * 3.4);
			}

			levels.push(level);
			levels.shift();

			context.clearRect(0, 0, width, height);
			const gap = 2 * ratio;
			const barWidth = Math.max(1, (width - gap * (BARS - 1)) / BARS);

			for (let index = 0; index < BARS; index += 1) {
				const value = Math.max(0.08, levels[index]);
				const barHeight = Math.max(3 * ratio, value * height);
				// Older samples fade out so the meter reads as motion, not noise.
				context.globalAlpha = 0.3 + 0.7 * (index / (BARS - 1));
				context.fillStyle = accent;
				context.beginPath();
				context.roundRect(
					index * (barWidth + gap),
					(height - barHeight) / 2,
					barWidth,
					barHeight,
					barWidth / 2,
				);
				context.fill();
			}

			context.globalAlpha = 1;
			frame = requestAnimationFrame(draw);
		};

		draw();

		return () => {
			cancelAnimationFrame(frame);
			observer?.disconnect();
		};
	}, [analyser]);

	return (
		<canvas ref={canvasRef} className="h-10 w-full [--meter-color:#7b2438]" />
	);
}
