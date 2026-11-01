import type { PhotoboothSettings } from "./types";

const RETRY_DELAY_MS = 100;
/** Gives the stylesheet that declares the @font-face rules time to register. */
const MAX_ATTEMPTS = 12;

interface FontRequest {
	font: string;
	text: string;
}

/** Exported for tests: one request per distinct font + sample text pair. */
export function collectPhotoboothFontRequests(
	settings: PhotoboothSettings,
): FontRequest[] {
	const requests = new Map<string, FontRequest>();

	for (const layout of Object.values(settings.layouts)) {
		for (const line of layout.text) {
			if (!line.value) continue;
			const font = `${line.fontWeight ?? 400} ${line.fontSize}px "${line.fontFamily}"`;
			const key = `${font}|${line.value}`;
			if (!requests.has(key)) requests.set(key, { font, text: line.value });
		}
	}

	return [...requests.values()];
}

/**
 * Loads the fonts the canvas card depends on.
 *
 * `document.fonts.load()` resolves with an **empty array** — it does not
 * reject — when no matching `@font-face` is registered yet (stylesheet still
 * loading) or when the family name is wrong. Treating that as success is what
 * made the card occasionally draw with the fallback serif, so the result is
 * checked and retried before the card is considered ready.
 *
 * The line text is passed as the sample text so the unicode-range subset that
 * actually contains the glyphs (e.g. "&") is the one that gets downloaded.
 */
export async function loadPhotoboothFonts(
	settings: PhotoboothSettings,
): Promise<boolean> {
	if (typeof document === "undefined" || !document.fonts) return false;

	const requests = collectPhotoboothFontRequests(settings);
	let loaded = false;

	for (let attempt = 0; attempt < MAX_ATTEMPTS && !loaded; attempt += 1) {
		const results = await Promise.all(
			requests.map(({ font, text }) =>
				document.fonts.load(font, text).catch(() => []),
			),
		);
		loaded = results.every((faces) => faces.length > 0);

		if (!loaded) {
			await new Promise((resolve) =>
				window.setTimeout(resolve, RETRY_DELAY_MS),
			);
		}
	}

	await document.fonts.ready;
	return loaded;
}
