/**
 * Canvas composition for the photobooth.
 *
 * Everything is drawn in Figma units and scaled by `layout.scale`, so the
 * preview and the downloaded JPEG come from the same drawing code.
 */

import type {
	PhotoboothConfig,
	PhotoboothLayout,
	PhotoboothSettings,
	PhotoboothSlot,
	PhotoboothTextLine,
} from "./types";

export const DISPLAY_FONT = "Playfair Display Variable";
export const BODY_FONT = "Montserrat Variable";
export const CARD_BACKGROUND = "#FFFFFF";
export const CARD_RADIUS = 10;

/** Builds drawable settings from the plain content layout in the data file. */
export function buildPhotoboothSettings(
	config: PhotoboothConfig,
): PhotoboothSettings {
	const lines = (y: number): PhotoboothTextLine[] => [
		{
			value: config.card.eyebrow,
			x: 60,
			y,
			width: 228,
			fontFamily: DISPLAY_FONT,
			fontSize: 8,
			letterSpacing: 0.8,
			color: "#000000",
			align: "center",
		},
		{
			value: config.card.names,
			x: 60,
			y: y + 16,
			width: 228,
			fontFamily: DISPLAY_FONT,
			fontSize: 18,
			color: "#000000",
			align: "center",
		},
		{
			value: config.card.date,
			x: 60,
			y: y + 41,
			width: 228,
			fontFamily: BODY_FONT,
			fontSize: 8,
			letterSpacing: 0.8,
			color: "#000000",
			align: "center",
		},
	];

	const layout = ({
		width,
		height,
		textY,
		slots,
	}: PhotoboothConfig["layouts"][1]): PhotoboothLayout => ({
		canvas: {
			width,
			height,
			radius: CARD_RADIUS,
			background: CARD_BACKGROUND,
		},
		slots: slots.map((slot) => ({ ...slot })),
		text: lines(textY),
		scale: config.scale,
	});

	return {
		layouts: {
			1: layout(config.layouts[1]),
			2: layout(config.layouts[2]),
			4: layout(config.layouts[4]),
		},
		downloadName: config.downloadName,
	};
}

interface SourceSize {
	width: number;
	height: number;
}

type PhotoSource =
	| HTMLVideoElement
	| HTMLImageElement
	| HTMLCanvasElement
	| ImageBitmap;

function sourceSize(source: PhotoSource): SourceSize {
	if (source instanceof HTMLVideoElement) {
		return { width: source.videoWidth, height: source.videoHeight };
	}
	if (source instanceof HTMLImageElement) {
		return { width: source.naturalWidth, height: source.naturalHeight };
	}
	return { width: source.width, height: source.height };
}

/**
 * Source rectangle used to cover a destination box without distortion.
 * Centre-cropped, so the middle of the frame is always what the guest keeps.
 */
export function coverRect(
	sourceWidth: number,
	sourceHeight: number,
	destWidth: number,
	destHeight: number,
): { x: number; y: number; width: number; height: number } {
	if (
		sourceWidth <= 0 ||
		sourceHeight <= 0 ||
		destWidth <= 0 ||
		destHeight <= 0
	) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	const destAspect = destWidth / destHeight;
	const sourceAspect = sourceWidth / sourceHeight;

	if (sourceAspect > destAspect) {
		const width = sourceHeight * destAspect;
		return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
	}

	const height = sourceWidth / destAspect;
	return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

/** Aspect ratio (w / h) of the first slot, i.e. the crop guide the guest sees. */
export function slotAspect(layout: PhotoboothLayout): number {
	const slot = layout.slots[0];
	if (!slot || slot.h <= 0) return 1;
	return slot.w / slot.h;
}

function drawCover(
	ctx: CanvasRenderingContext2D,
	source: PhotoSource,
	slot: PhotoboothSlot,
	mirror = false,
): void {
	const { width: sourceWidth, height: sourceHeight } = sourceSize(source);
	const rect = coverRect(sourceWidth, sourceHeight, slot.w, slot.h);
	if (rect.width <= 0 || rect.height <= 0) return;

	if (!mirror) {
		ctx.drawImage(
			source,
			rect.x,
			rect.y,
			rect.width,
			rect.height,
			slot.x,
			slot.y,
			slot.w,
			slot.h,
		);
		return;
	}

	ctx.save();
	ctx.translate(slot.x + slot.w, slot.y);
	ctx.scale(-1, 1);
	ctx.drawImage(
		source,
		rect.x,
		rect.y,
		rect.width,
		rect.height,
		0,
		0,
		slot.w,
		slot.h,
	);
	ctx.restore();
}

function measureSpaced(
	ctx: CanvasRenderingContext2D,
	text: string,
	spacing: number,
): number {
	if (!spacing) return ctx.measureText(text).width;
	return text
		.split("")
		.reduce(
			(total, char, index) =>
				total + ctx.measureText(char).width + (index > 0 ? spacing : 0),
			0,
		);
}

/** Letter spacing is drawn per glyph — `ctx.letterSpacing` is not universal yet. */
function drawSpaced(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	spacing: number,
): void {
	if (!spacing) {
		ctx.fillText(text, x, y);
		return;
	}

	let cursor = x;
	for (const char of text) {
		ctx.fillText(char, cursor, y);
		cursor += ctx.measureText(char).width + spacing;
	}
}

/** Canvas text is auto-shrunk down to this size to fit its layout box. */
const MIN_FONT_SIZE = 6;

function drawTextLine(ctx: CanvasRenderingContext2D, line: PhotoboothTextLine) {
	if (!line.value) return;

	ctx.fillStyle = line.color ?? "#000000";
	ctx.textBaseline = "top";
	ctx.textAlign = "left";

	const spacing = line.letterSpacing ?? 0;
	const fontFor = (size: number) =>
		`${line.fontWeight ?? 400} ${size}px "${line.fontFamily}", serif`;

	// Copy can be longer than the Figma mock, so shrink until it fits its box.
	let fontSize = line.fontSize;
	ctx.font = fontFor(fontSize);
	let measured = measureSpaced(ctx, line.value, spacing);
	while (measured > line.width && fontSize > MIN_FONT_SIZE) {
		fontSize = Math.max(MIN_FONT_SIZE, fontSize - 0.5);
		ctx.font = fontFor(fontSize);
		measured = measureSpaced(ctx, line.value, spacing);
	}

	const align = line.align ?? "center";
	const startX =
		align === "center"
			? line.x + (line.width - measured) / 2
			: align === "right"
				? line.x + line.width - measured
				: line.x;

	drawSpaced(ctx, line.value, startX, line.y, spacing);
}

function roundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + width - r, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + r);
	ctx.lineTo(x + width, y + height - r);
	ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	ctx.lineTo(x + r, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

/**
 * Renders the final card (background + photos + text) into `target`.
 * The canvas is resized to the layout's output size.
 */
export function drawComposition(
	target: HTMLCanvasElement,
	layout: PhotoboothLayout,
	photos: PhotoSource[],
	options: { mirror?: boolean } = {},
): void {
	const { scale } = layout;
	const width = Math.round(layout.canvas.width * scale);
	const height = Math.round(layout.canvas.height * scale);

	target.width = width;
	target.height = height;

	const ctx = target.getContext("2d");
	if (!ctx) return;

	ctx.clearRect(0, 0, width, height);
	roundedRect(ctx, 0, 0, width, height, layout.canvas.radius * scale);
	ctx.fillStyle = layout.canvas.background;
	ctx.fill();

	ctx.save();
	ctx.clip();
	ctx.scale(scale, scale);

	layout.slots.forEach((slot, index) => {
		const photo = photos[index];
		if (!photo) return;
		drawCover(ctx, photo, slot, options.mirror ?? false);
	});

	layout.text.forEach((line) => {
		drawTextLine(ctx, line);
	});

	ctx.restore();
}

/**
 * Region of the raw video frame that reaches the screen.
 *
 * The `<video>` element renders with `object-cover` inside the camera box, so
 * part of the frame is already cropped before the guest sees it. Captures must
 * start from that visible region, otherwise the result shows more of the scene
 * than the crop guide promised.
 */
export function cameraCropRect(
	sourceWidth: number,
	sourceHeight: number,
	boxAspect: number,
	slotAspectRatio: number,
): { x: number; y: number; width: number; height: number } {
	const visible = coverRect(sourceWidth, sourceHeight, boxAspect, 1);

	let width = visible.width;
	let height = width / slotAspectRatio;
	if (height > visible.height) {
		height = visible.height;
		width = height * slotAspectRatio;
	}

	return {
		x: visible.x + (visible.width - width) / 2,
		y: visible.y + (visible.height - height) / 2,
		width,
		height,
	};
}

/**
 * Crops the current video frame to `slot`'s aspect ratio and returns it at
 * output resolution. Used once per shutter press.
 */
export function captureFrame(
	video: HTMLVideoElement,
	slot: PhotoboothSlot,
	scale: number,
	mirror: boolean,
	boxAspect: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(slot.w * scale);
	canvas.height = Math.round(slot.h * scale);

	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;

	const rect = cameraCropRect(
		video.videoWidth,
		video.videoHeight,
		boxAspect,
		slot.w / slot.h,
	);
	if (rect.width <= 0 || rect.height <= 0) return canvas;

	if (!mirror) {
		ctx.drawImage(
			video,
			rect.x,
			rect.y,
			rect.width,
			rect.height,
			0,
			0,
			canvas.width,
			canvas.height,
		);
		return canvas;
	}

	ctx.save();
	ctx.translate(canvas.width, 0);
	ctx.scale(-1, 1);
	ctx.drawImage(
		video,
		rect.x,
		rect.y,
		rect.width,
		rect.height,
		0,
		0,
		canvas.width,
		canvas.height,
	);
	ctx.restore();

	return canvas;
}

/**
 * Loads a picked image file and crops it to the slot aspect ratio at output
 * resolution. Used as the fallback when the camera is blocked or missing.
 */
export function captureImageFile(
	file: File,
	slot: PhotoboothSlot,
	scale: number,
): Promise<HTMLCanvasElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = Math.round(slot.w * scale);
			canvas.height = Math.round(slot.h * scale);

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				URL.revokeObjectURL(url);
				reject(new Error("PHOTOBOOTH_CANVAS_UNAVAILABLE"));
				return;
			}

			const rect = coverRect(
				image.naturalWidth,
				image.naturalHeight,
				canvas.width,
				canvas.height,
			);
			ctx.drawImage(
				image,
				rect.x,
				rect.y,
				rect.width,
				rect.height,
				0,
				0,
				canvas.width,
				canvas.height,
			);
			URL.revokeObjectURL(url);
			resolve(canvas);
		};

		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("PHOTOBOOTH_IMAGE_FAILED"));
		};

		image.src = url;
	});
}

/** Triggers a browser download of the composed card. */
export function downloadCanvas(
	canvas: HTMLCanvasElement,
	fileName: string,
	quality = 0.95,
): Promise<void> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("PHOTOBOOTH_BLOB_FAILED"));
					return;
				}

				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = fileName;
				document.body.appendChild(link);
				link.click();
				link.remove();
				window.setTimeout(() => URL.revokeObjectURL(url), 1000);
				resolve();
			},
			"image/jpeg",
			quality,
		);
	});
}
