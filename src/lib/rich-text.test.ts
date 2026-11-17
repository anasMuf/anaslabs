import { describe, expect, it } from "vitest";
import { parseEmphasis } from "./rich-text";

describe("parseEmphasis", () => {
	it("returns a single plain segment when there is no markup", () => {
		expect(parseEmphasis("Orang bilang, benar.")).toEqual([
			{ text: "Orang bilang, benar.", strong: false, start: 0 },
		]);
	});

	it("splits one emphasised clause out of a sentence", () => {
		expect(parseEmphasis("Orang bilang, **jalan pulang**. Dan benar.")).toEqual(
			[
				{ text: "Orang bilang, ", strong: false, start: 0 },
				{ text: "jalan pulang", strong: true, start: 14 },
				{ text: ". Dan benar.", strong: false, start: 30 },
			],
		);
	});

	it("handles several emphasised runs", () => {
		expect(parseEmphasis("**a** lalu **b**")).toEqual([
			{ text: "a", strong: true, start: 0 },
			{ text: " lalu ", strong: false, start: 5 },
			{ text: "b", strong: true, start: 11 },
		]);
	});

	it("handles a fully emphasised string", () => {
		expect(parseEmphasis("**semua**")).toEqual([
			{ text: "semua", strong: true, start: 0 },
		]);
	});

	it("leaves unmatched markers as literal text", () => {
		expect(parseEmphasis("setengah **tebal")).toEqual([
			{ text: "setengah **tebal", strong: false, start: 0 },
		]);
	});

	it("keeps an empty marker pair as literal text", () => {
		expect(parseEmphasis("****")).toEqual([
			{ text: "****", strong: false, start: 0 },
		]);
	});

	it("gives every segment a unique start offset", () => {
		const segments = parseEmphasis("**a** b **c**");
		const starts = segments.map((segment) => segment.start);
		expect(new Set(starts).size).toBe(starts.length);
	});
});
