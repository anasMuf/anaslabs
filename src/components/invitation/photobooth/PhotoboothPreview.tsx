import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invitation } from "#/data/invitation";
import {
	downloadCanvas,
	drawComposition,
} from "#/lib/photobooth/draw-composition";
import type {
	PhotoboothGrid,
	PhotoboothSettings,
} from "#/lib/photobooth/types";

interface PhotoboothPreviewProps {
	settings: PhotoboothSettings;
	grid: PhotoboothGrid;
	photos: HTMLCanvasElement[];
	/** Canvas text needs the template fonts; redraw once they are usable. */
	fontsReady: boolean;
	onRetake: () => void;
	onBack: () => void;
}

export default function PhotoboothPreview({
	settings,
	grid,
	photos,
	fontsReady,
	onRetake,
	onBack,
}: PhotoboothPreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const revertTimer = useRef<number | null>(null);
	const layout = settings.layouts[grid];

	const redraw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		drawComposition(canvas, layout, photos);
	}, [layout, photos]);

	useEffect(() => {
		redraw();
	}, [redraw]);

	// The card can be painted before the webfonts finish loading. Repaint when
	// the font set settles or any face finishes, so the canvas (and the JPEG
	// saved from it) never keeps a fallback serif. This is the safety net for
	// the font-loading race: without it the first paint is final.
	useEffect(() => {
		if (typeof document === "undefined" || !document.fonts) return;

		const handleLoadingDone = () => redraw();
		document.fonts.addEventListener("loadingdone", handleLoadingDone);
		void document.fonts.ready.then(handleLoadingDone);

		return () => {
			document.fonts.removeEventListener("loadingdone", handleLoadingDone);
		};
	}, [redraw]);

	useEffect(() => {
		return () => {
			if (revertTimer.current !== null)
				window.clearTimeout(revertTimer.current);
		};
	}, []);

	const handleSave = async () => {
		const canvas = canvasRef.current;
		if (!canvas || saving) return;

		setSaving(true);
		try {
			// Paint once more after any in-flight font load settles; the save happens
			// immediately after, so the JPEG cannot capture a fallback face.
			if (typeof document !== "undefined" && document.fonts) {
				await document.fonts.ready;
			}
			redraw();

			await downloadCanvas(
				canvas,
				`${settings.downloadName ?? "photobooth"}.jpg`,
			);
			setSaved(true);
			if (revertTimer.current !== null)
				window.clearTimeout(revertTimer.current);
			revertTimer.current = window.setTimeout(() => setSaved(false), 2000);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex min-h-dvh flex-col bg-inv-bg text-inv-ink">
			<h1 className="sr-only">
				Hasil photobooth pernikahan {invitation.cover.firstNames} &amp;{" "}
				{invitation.cover.secondNames}
			</h1>
			<header className="px-4 pt-4">
				<button
					type="button"
					onClick={onBack}
					aria-label="Kembali ke undangan"
					className="flex h-14 w-14 items-center justify-center rounded-full border border-inv-ink/25 transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<ArrowLeft size={24} />
				</button>
			</header>

			<main className="flex flex-1 items-center justify-center px-6 py-4">
				<canvas
					ref={canvasRef}
					role="img"
					aria-label={`Kartu photobooth berisi ${photos.length} foto`}
					className="max-h-[56vh] w-auto max-w-full rounded-[10px] shadow-[0_10px_30px_rgba(52,54,46,0.12)]"
					style={{ backgroundColor: layout.canvas.background }}
				/>
			</main>

			<footer className="flex flex-col gap-3 px-8 pb-10">
				<button
					type="button"
					onClick={() => void handleSave()}
					disabled={saving || !fontsReady}
					className="flex items-center justify-center gap-2 rounded-full bg-inv-accent px-5 py-3.5 text-[12px] tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<Download size={16} />
					{saving ? "Menyimpan…" : saved ? "Tersimpan" : "Simpan"}
				</button>

				<button
					type="button"
					onClick={onRetake}
					className="flex items-center justify-center gap-2 rounded-full border border-inv-ink/25 px-5 py-3.5 text-[12px] tracking-[0.08em] transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<RotateCcw size={16} />
					Ulangi
				</button>

				<button
					type="button"
					onClick={onBack}
					className="inline-flex min-h-[44px] items-center justify-center py-2 text-[12px] text-inv-muted transition-colors hover:text-inv-ink"
				>
					Kembali ke undangan
				</button>
			</footer>
		</div>
	);
}
