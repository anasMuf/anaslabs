import { describe, expect, it } from "vitest";
import { getAudioSource } from "./audio-source";

describe("getAudioSource", () => {
	it("treats a plain https URL as a direct file", () => {
		expect(
			getAudioSource(
				"https://example.supabase.co/storage/v1/object/public/a.mp3",
			),
		).toMatchObject({ type: "direct", id: null });
	});

	it("recognises youtu.be short links", () => {
		expect(getAudioSource("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({
			type: "youtube",
			id: "dQw4w9WgXcQ",
		});
	});

	it("recognises watch, shorts, embed and music hosts", () => {
		expect(
			getAudioSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"),
		).toMatchObject({ type: "youtube", id: "dQw4w9WgXcQ" });
		expect(
			getAudioSource("https://youtube.com/shorts/dQw4w9WgXcQ"),
		).toMatchObject({ type: "youtube", id: "dQw4w9WgXcQ" });
		expect(
			getAudioSource("https://www.youtube.com/embed/dQw4w9WgXcQ"),
		).toMatchObject({ type: "youtube", id: "dQw4w9WgXcQ" });
		expect(
			getAudioSource("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
		).toMatchObject({ type: "youtube", id: "dQw4w9WgXcQ" });
	});

	it("rejects a YouTube host without a usable video id", () => {
		expect(getAudioSource("https://www.youtube.com/@anas")).toMatchObject({
			type: "unknown",
		});
		expect(getAudioSource("https://youtu.be/")).toMatchObject({
			type: "unknown",
		});
	});

	it("rejects empty, relative and non-http URLs", () => {
		expect(getAudioSource("").type).toBe("unknown");
		expect(getAudioSource(null).type).toBe("unknown");
		expect(getAudioSource("/invitation/music.mp3").type).toBe("unknown");
		expect(getAudioSource("ftp://example.com/a.mp3").type).toBe("unknown");
	});
});
