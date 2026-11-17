import { describe, expect, it } from "vitest";
import { barsFromPeaks, computePeaks, MIN_BAR_RATIO } from "./audio-peaks";

function ramp(length: number): Float32Array {
	const samples = new Float32Array(length);
	for (let index = 0; index < length; index += 1) {
		samples[index] = index / length;
	}
	return samples;
}

describe("computePeaks", () => {
	it("returns one normalised value per bucket", () => {
		const peaks = computePeaks(ramp(320), 32);
		expect(peaks).toHaveLength(32);
		expect(Math.max(...peaks)).toBeCloseTo(1, 5);
	});

	it("puts the loudest window at the end of a ramp", () => {
		const peaks = computePeaks(ramp(320), 32);
		expect(peaks[31]).toBeGreaterThan(peaks[0]);
	});

	it("returns zeros for silence so the caller can draw a flat line", () => {
		expect(computePeaks(new Float32Array(320), 8)).toEqual([
			0, 0, 0, 0, 0, 0, 0, 0,
		]);
	});

	it("handles empty input and zero buckets without throwing", () => {
		expect(computePeaks(new Float32Array(0), 4)).toEqual([0, 0, 0, 0]);
		expect(computePeaks(ramp(10), 0)).toEqual([]);
	});
});

describe("barsFromPeaks", () => {
	it("clamps to the minimum bar height and to 1", () => {
		expect(barsFromPeaks([0, 0.5, 2])).toEqual([MIN_BAR_RATIO, 0.5, 1]);
	});
});
