import { useEffect, useMemo, useState } from "react";
import type { PhotoboothFrame } from "./types";

/**
 * Preloads every overlay for one layout, in array order.
 *
 * `crossOrigin` keeps the canvas untainted so the guest can still download the
 * JPEG and publish it to the wall. A failed load leaves a `null` slot and the
 * remaining overlays still render.
 */
const cache = new Map<string, HTMLImageElement>();

function loadFrame(url: string): Promise<HTMLImageElement | null> {
	const cached = cache.get(url);
	if (cached) return Promise.resolve(cached);

	return new Promise((resolve) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => {
			cache.set(url, image);
			resolve(image);
		};
		image.onerror = () => resolve(null);
		image.src = url;
	});
}

export function useFrameImages(
	frames: PhotoboothFrame[] | undefined,
): (HTMLImageElement | null)[] {
	const urls = useMemo(
		() => (frames ?? []).map((frame) => frame.url),
		[frames],
	);
	const [images, setImages] = useState<(HTMLImageElement | null)[]>(() =>
		urls.map((url) => cache.get(url) ?? null),
	);

	useEffect(() => {
		if (!urls.length) {
			setImages([]);
			return;
		}

		let cancelled = false;
		void Promise.all(urls.map(loadFrame)).then((result) => {
			if (!cancelled) setImages(result);
		});

		return () => {
			cancelled = true;
		};
	}, [urls]);

	return images;
}

/** Single-image convenience for the global background. */
export function useFrameImage(
	frame: PhotoboothFrame | undefined,
): HTMLImageElement | null {
	const frames = useMemo(() => (frame ? [frame] : []), [frame]);
	return useFrameImages(frames)[0] ?? null;
}
