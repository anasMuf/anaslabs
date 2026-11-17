/**
 * Peak extraction for the voice note waveform.
 *
 * Kept pure so the maths can be tested without an AudioContext: the browser
 * only has to hand us decoded PCM samples.
 */

export const VOICE_PEAK_BUCKETS = 44;

/** Smallest visible bar, so silence still draws a thin line instead of nothing. */
export const MIN_BAR_RATIO = 0.12;

/**
 * Splits `samples` into `buckets` windows, takes the RMS of each and normalises
 * against the loudest window. Returns values in 0..1.
 */
export function computePeaks(
	samples: Float32Array,
	buckets: number = VOICE_PEAK_BUCKETS,
): number[] {
	if (samples.length === 0 || buckets <= 0) return new Array(buckets).fill(0);

	const windowSize = Math.max(1, Math.floor(samples.length / buckets));
	const peaks: number[] = [];

	for (let bucket = 0; bucket < buckets; bucket += 1) {
		const start = bucket * windowSize;
		const end = Math.min(start + windowSize, samples.length);
		let sum = 0;
		let count = 0;

		for (let index = start; index < end; index += 1) {
			const value = samples[index];
			sum += value * value;
			count += 1;
		}

		peaks.push(count > 0 ? Math.sqrt(sum / count) : 0);
	}

	const loudest = Math.max(...peaks);
	if (loudest <= 0.0001) return peaks.map(() => 0);

	return peaks.map((peak) => Math.min(1, peak / loudest));
}

/** Raises every bar to the minimum height so the waveform never looks broken. */
export function barsFromPeaks(
	peaks: number[],
	minRatio: number = MIN_BAR_RATIO,
): number[] {
	return peaks.map((peak) => Math.max(minRatio, Math.min(1, peak)));
}

/** Placeholder waveform for audio whose peaks are not known (yet). */
export function silenceBars(
	count: number = VOICE_PEAK_BUCKETS,
	minRatio: number = MIN_BAR_RATIO,
): number[] {
	return new Array(count).fill(minRatio);
}
