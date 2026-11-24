import { describe, expect, it } from "vitest";
import { effectiveBlastChannel, parseBlastChannel } from "./attribution";

describe("blast attribution", () => {
	it("falls back to the sheet source", () => {
		expect(effectiveBlastChannel({ source: "anas", blastChannel: null })).toBe(
			"anas",
		);
	});

	it("uses the per-guest override", () => {
		expect(
			effectiveBlastChannel({ source: "anas", blastChannel: "mila" }),
		).toBe("mila");
	});

	it("only accepts known channels", () => {
		expect(parseBlastChannel("anas")).toBe("anas");
		expect(parseBlastChannel("mila")).toBe("mila");
		expect(parseBlastChannel("")).toBeNull();
		expect(parseBlastChannel("lain")).toBeNull();
	});
});
