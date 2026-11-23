import { useEffect, useMemo, useRef } from "react";
import type { InvitationContent } from "#/lib/invitation-content-schema";
import {
	buildPhotoboothSettings,
	drawComposition,
} from "#/lib/photobooth/draw-composition";
import { loadPhotoboothFonts } from "#/lib/photobooth/fonts";
import type { PhotoboothGrid } from "#/lib/photobooth/types";
import {
	useFrameImage,
	useFrameImages,
} from "#/lib/photobooth/use-frame-image";

interface PhotoboothPreviewCanvasProps {
	photobooth: InvitationContent["photobooth"];
	grid: PhotoboothGrid;
}

/** Neutral placeholder so the preview shows composition, not a camera feed. */
function placeholderPhoto(
	width: number,
	height: number,
	index: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width * 2));
	canvas.height = Math.max(1, Math.round(height * 2));

	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;

	const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, "#efe7df");
	gradient.addColorStop(1, "#d4c3b5");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "rgba(52, 54, 46, 0.35)";
	ctx.font = `600 ${Math.round(canvas.width * 0.06)}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(`FOTO ${index + 1}`, canvas.width / 2, canvas.height / 2);

	return canvas;
}

/**
 * Draws the real photobooth composition with placeholder photos.
 *
 * Uses the same `buildPhotoboothSettings` + `drawComposition` pair as the guest
 * download, so the preview cannot drift from the generated card.
 */
export default function PhotoboothPreviewCanvas({
	photobooth,
	grid,
}: PhotoboothPreviewCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const settings = useMemo(
		() => buildPhotoboothSettings(photobooth),
		[photobooth],
	);
	const layout = settings.layouts[grid];
	const backgroundImage = useFrameImage(layout.backgroundImage);
	const overlayImages = useFrameImages(layout.overlays);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const photos = layout.slots.map((slot, index) =>
			placeholderPhoto(slot.w, slot.h, index),
		);
		let cancelled = false;

		const draw = () => {
			if (cancelled) return;
			drawComposition(canvas, layout, photos, {
				backgroundImage,
				overlayImages,
			});
		};

		draw();
		void loadPhotoboothFonts(settings)
			.then(draw)
			.catch(() => undefined);

		return () => {
			cancelled = true;
		};
	}, [backgroundImage, layout, overlayImages, settings]);

	return (
		<canvas
			ref={canvasRef}
			role="img"
			aria-label={`Pratinjau kartu photobooth layout ${grid}`}
			className="block h-auto w-full rounded-[10px] bg-white"
		/>
	);
}
