import { describe, expect, it } from "vitest";
import { invitation } from "#/data/invitation";
import { defaultContent } from "./invitation-content-default";
import {
	contentVersionChanged,
	type InvitationContent,
	invitationContentSchema,
	mergeContent,
	parseContent,
} from "./invitation-content-schema";

function edited(): InvitationContent {
	return structuredClone(defaultContent);
}

describe("defaultContent", () => {
	it("matches the authored data file and passes the schema", () => {
		expect(defaultContent.cover.firstNames).toBe(invitation.cover.firstNames);
		expect(defaultContent.events).toHaveLength(invitation.events.length);
		expect(defaultContent.music.enabled).toBe(false);
		expect(() => invitationContentSchema.parse(defaultContent)).not.toThrow();
	});
});

describe("parseContent", () => {
	it("accepts an empty document by falling back to defaults", () => {
		const result = parseContent({});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.content.cover.firstNames).toBe(invitation.cover.firstNames);
	});

	it("fills missing fields from defaults instead of wiping a section", () => {
		const result = parseContent({ cover: { eyebrow: "Undangan Baru" } });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.content.cover.eyebrow).toBe("Undangan Baru");
		expect(result.content.cover.firstNames).toBe(invitation.cover.firstNames);
	});

	it("drops unknown keys", () => {
		const result = parseContent({ extra: true });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect("extra" in result.content).toBe(false);
	});

	it("rejects an impossible date", () => {
		const stored = edited();
		stored.events[0].date = "2026-02-31";

		const result = parseContent(stored);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.issues.join(" ")).toContain("Tanggal tidak valid");
	});

	it("rejects an event id that a side points to but does not exist", () => {
		const stored = edited();
		stored.sides.groom.eventIds = ["acara-hilang"];

		const result = parseContent(stored);

		expect(result.ok).toBe(false);
	});

	it("rejects an enabled music track without a URL", () => {
		const stored = edited();
		stored.music = { enabled: true, url: null, title: "Lagu" };

		const result = parseContent(stored);

		expect(result.ok).toBe(false);
	});

	it("rejects a photobooth layout with the wrong slot count", () => {
		const stored = edited();
		stored.photobooth.layouts["1"].slots = [];

		const result = parseContent(stored);

		expect(result.ok).toBe(false);
	});

	it("rejects a slot outside the canvas", () => {
		const stored = edited();
		stored.photobooth.layouts["1"].slots[0].x = 400;

		const result = parseContent(stored);

		expect(result.ok).toBe(false);
	});
});

describe("mergeContent", () => {
	it("leaves defaults untouched for unknown stored shapes", () => {
		expect(mergeContent(null)).toBe(defaultContent);
		expect(mergeContent("nope")).toBe(defaultContent);
	});
});

describe("contentVersionChanged", () => {
	it("treats two nulls as unchanged", () => {
		expect(contentVersionChanged(null, null)).toBe(false);
	});

	it("compares the instant, not the string form", () => {
		expect(
			contentVersionChanged(
				"2026-01-01T00:00:00.000Z",
				"2026-01-01T00:00:00+00:00",
			),
		).toBe(false);
	});

	it("flags a newer stored row", () => {
		expect(
			contentVersionChanged(
				"2026-01-01T00:00:01.000Z",
				"2026-01-01T00:00:00.000Z",
			),
		).toBe(true);
	});

	it("flags a missing or unreadable version", () => {
		expect(contentVersionChanged("2026-01-01T00:00:00.000Z", null)).toBe(true);
		expect(
			contentVersionChanged("bukan-tanggal", "2026-01-01T00:00:00.000Z"),
		).toBe(true);
	});
});
