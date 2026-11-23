/**
 * Audio source classification for the invitation player.
 *
 * Pure so the URL rules are unit tested: a YouTube link may arrive as
 * `youtu.be/ID`, `/watch?v=ID`, `/shorts/ID`, `/embed/ID`, or
 * `music.youtube.com/watch?v=ID`, while everything else http(s) is treated as a
 * direct file for `<audio>`.
 */

export type AudioSourceType = "direct" | "youtube" | "unknown";

export interface AudioSource {
	type: AudioSourceType;
	url: string;
	/** YouTube video id when `type === "youtube"`. */
	id: string | null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

function isYouTubeHost(hostname: string): boolean {
	return (
		hostname === "youtu.be" ||
		hostname === "youtube.com" ||
		hostname === "m.youtube.com" ||
		hostname === "music.youtube.com"
	);
}

function pathSegment(pathname: string, prefix: string): string {
	if (!pathname.startsWith(prefix)) return "";
	return pathname.slice(prefix.length).split("/")[0] ?? "";
}

export function getAudioSource(url: string | null | undefined): AudioSource {
	const raw = (url ?? "").trim();
	if (!raw) return { type: "unknown", url: "", id: null };

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return { type: "unknown", url: raw, id: null };
	}

	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		return { type: "unknown", url: raw, id: null };
	}

	const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
	if (!isYouTubeHost(hostname)) {
		return { type: "direct", url: raw, id: null };
	}

	let id = "";
	if (hostname === "youtu.be") {
		id = pathSegment(parsed.pathname, "/");
	} else if (parsed.pathname === "/watch") {
		id = parsed.searchParams.get("v") ?? "";
	} else if (parsed.pathname.startsWith("/shorts/")) {
		id = pathSegment(parsed.pathname, "/shorts/");
	} else if (parsed.pathname.startsWith("/embed/")) {
		id = pathSegment(parsed.pathname, "/embed/");
	}

	if (!YOUTUBE_ID.test(id)) {
		return { type: "unknown", url: raw, id: null };
	}

	return { type: "youtube", url: raw, id };
}
