import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { invitation } from "#/data/invitation";
import { buildPhotoboothSettings } from "#/lib/photobooth/draw-composition";
import { loadPhotoboothFonts } from "#/lib/photobooth/fonts";
import type { PhotoboothGrid, PhotoboothTimer } from "#/lib/photobooth/types";
import PhotoboothCapture from "./PhotoboothCapture";
import PhotoboothPreview from "./PhotoboothPreview";

interface PhotoboothPageProps {
	slug: string;
}

/**
 * Standalone photobooth (`/invitation/:slug/photobooth`).
 *
 * Opened in its own tab from the invitation. Captures stay on the device: the
 * composed card is drawn in a canvas and offered as a download.
 */
export default function PhotoboothPage({ slug }: PhotoboothPageProps) {
	const settings = useMemo(
		() => buildPhotoboothSettings(invitation.photobooth),
		[],
	);
	const navigate = useNavigate();

	const [grid, setGrid] = useState<PhotoboothGrid>(1);
	const [timer, setTimer] = useState<PhotoboothTimer>(0);
	const [photos, setPhotos] = useState<HTMLCanvasElement[]>([]);
	const [phase, setPhase] = useState<"capture" | "preview">("capture");
	const [fontsReady, setFontsReady] = useState(false);

	// Closing the tab keeps the invitation tab in front; when the tab was not
	// opened by a script `window.close()` is a no-op, so fall back to navigating
	// back to the invitation in the same tab.
	const exit = useCallback(() => {
		window.close();
		window.setTimeout(() => {
			if (!window.closed) {
				void navigate({ to: "/invitation/$slug", params: { slug } });
			}
		}, 200);
	}, [navigate, slug]);

	// Make the device back button behave like the on-screen back button.
	useEffect(() => {
		window.history.pushState({ photobooth: true }, "");
		const handlePopState = () => exit();
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [exit]);

	// Canvas text needs the fonts to be usable before the card is drawn,
	// otherwise the downloaded JPEG falls back to a serif system font.
	useEffect(() => {
		let cancelled = false;

		void loadPhotoboothFonts(settings).then(() => {
			// `false` means the faces never registered (e.g. CSS failed to load).
			// The card still draws and the preview repaints on `loadingdone`, so the
			// guest is never blocked — only the save button waits for this attempt.
			if (!cancelled) setFontsReady(true);
		});

		return () => {
			cancelled = true;
		};
	}, [settings]);

	const handleComplete = useCallback((next: HTMLCanvasElement[]) => {
		setPhotos(next);
		setPhase("preview");
	}, []);

	const handleRetake = useCallback(() => {
		setPhotos([]);
		setPhase("capture");
	}, []);

	if (phase === "preview") {
		return (
			<PhotoboothPreview
				settings={settings}
				grid={grid}
				photos={photos}
				fontsReady={fontsReady}
				onRetake={handleRetake}
				onBack={exit}
			/>
		);
	}

	return (
		<PhotoboothCapture
			settings={settings}
			grid={grid}
			timer={timer}
			onGridChange={setGrid}
			onTimerChange={setTimer}
			onComplete={handleComplete}
			onBack={exit}
		/>
	);
}
