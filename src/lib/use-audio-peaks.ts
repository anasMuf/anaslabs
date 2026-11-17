import { useEffect, useState } from "react";
import { computePeaks } from "./audio-peaks";

/**
 * Peaks for any audio URL, decoded in the browser.
 *
 * The wall only has a signed URL (no local blob), so the dialog fetches the
 * clip, decodes it once and caches the waveform per URL: reopening the same
 * card is free, and a failure just falls back to a flat waveform while the
 * audio still plays.
 */
const cache = new Map<string, number[]>();

async function decodePeaks(url: string): Promise<number[]> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`audio ${response.status}`);

	const buffer = await response.arrayBuffer();
	const context = new AudioContext();

	try {
		const decoded = await context.decodeAudioData(buffer);
		return computePeaks(decoded.getChannelData(0));
	} finally {
		void context.close().catch(() => undefined);
	}
}

export function useAudioPeaks(url: string | null): number[] {
	const [peaks, setPeaks] = useState<number[]>(() =>
		url ? (cache.get(url) ?? []) : [],
	);

	useEffect(() => {
		if (!url) {
			setPeaks([]);
			return;
		}

		const cached = cache.get(url);
		if (cached) {
			setPeaks(cached);
			return;
		}

		let cancelled = false;
		setPeaks([]);

		void decodePeaks(url)
			.then((result) => {
				cache.set(url, result);
				if (!cancelled) setPeaks(result);
			})
			.catch(() => {
				// Leave the waveform empty; VoicePlayer falls back to a flat bar strip.
			});

		return () => {
			cancelled = true;
		};
	}, [url]);

	return peaks;
}
