import {
	WALL_PHOTO_MAX_BYTES,
	WALL_THUMB_MAX_BYTES,
} from "#/lib/wall-validation";

/**
 * Turns the composed photobooth canvas into the two images the wall stores.
 *
 * The card is drawn at `layout.scale` (3x, ~1044px wide) for the download, but
 * the wall never needs that: the dialog shows it at 360 CSS px, so a 900px wide
 * JPEG is sharp on 2x screens and roughly half the bytes. Quality steps down
 * until the payload fits the server limit instead of failing the upload.
 */

const WALL_PHOTO_MAX_WIDTH = 900;
const WALL_THUMB_MAX_WIDTH = 320;
const PHOTO_QUALITIES = [0.82, 0.72, 0.62, 0.5];

export interface WallImages {
	photo: string;
	thumb: string;
}

function approxBytes(dataUrl: string): number {
	const comma = dataUrl.indexOf(",");
	if (comma === -1) return 0;
	const base64 = dataUrl.slice(comma + 1);
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	return Math.floor((base64.length * 3) / 4) - padding;
}

function scaleTo(
	source: HTMLCanvasElement,
	maxWidth: number,
): HTMLCanvasElement {
	const ratio = Math.min(1, maxWidth / source.width);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(source.width * ratio));
	canvas.height = Math.max(1, Math.round(source.height * ratio));

	const context = canvas.getContext("2d");
	if (!context) throw new Error("Kanvas tidak tersedia di browser ini.");

	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";
	// The card itself is opaque, but JPEG has no alpha: paint white first so a
	// transparent corner never turns black.
	context.fillStyle = "#ffffff";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(source, 0, 0, canvas.width, canvas.height);

	return canvas;
}

export function buildWallImages(source: HTMLCanvasElement): WallImages {
	const photoCanvas = scaleTo(source, WALL_PHOTO_MAX_WIDTH);

	let photo = photoCanvas.toDataURL("image/jpeg", PHOTO_QUALITIES[0]);
	for (const quality of PHOTO_QUALITIES) {
		photo = photoCanvas.toDataURL("image/jpeg", quality);
		if (approxBytes(photo) <= WALL_PHOTO_MAX_BYTES) break;
	}

	const thumb = scaleTo(source, WALL_THUMB_MAX_WIDTH).toDataURL(
		"image/jpeg",
		0.78,
	);

	if (approxBytes(thumb) > WALL_THUMB_MAX_BYTES) {
		throw new Error("Thumbnail terlalu besar.");
	}
	if (approxBytes(photo) > WALL_PHOTO_MAX_BYTES) {
		throw new Error("Foto terlalu besar untuk dikirim.");
	}

	return { photo, thumb };
}
