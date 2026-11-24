// biome-ignore-all lint/suspicious/noArrayIndexKey: photobooth slots are ordered and have no id; rows hold no independent state.
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultContent } from "#/lib/invitation-content-default";
import type { InvitationContent } from "#/lib/invitation-content-schema";
import type { PhotoboothFrame, PhotoboothGrid } from "#/lib/photobooth/types";
import { useFrameImage } from "#/lib/photobooth/use-frame-image";
import FrameUpload from "./FrameUpload";

type Photobooth = InvitationContent["photobooth"];
type Layout = Photobooth["layouts"]["1"];
type Slot = Layout["slots"][number];

const MIN_SLOT = 40;
const TEXT_WIDTH = 228;
const TEXT_HEIGHT = 62;

const buttonClass =
	"rounded-full border border-inv-rule px-3 py-1.5 font-body text-[10px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

type Selection =
	| { type: "slot"; index: number }
	| { type: "text" }
	| { type: "overlay"; index: number }
	| { type: "background" }
	| null;

interface DragState {
	mode: "move" | "resize";
	target: "slot" | "text" | "overlay" | "background";
	index?: number;
	startClientX: number;
	startClientY: number;
	startSlot?: Slot;
	startTextX?: number;
	startTextY?: number;
	startOverlay?: PhotoboothFrame;
	startBackground?: PhotoboothFrame;
}

interface FrameEditorProps {
	photobooth: Photobooth;
	grid: PhotoboothGrid;
	onChange: (next: Photobooth) => void;
}

/**
 * Interactive composition editor for the photobooth card.
 *
 * Geometry lives in Figma units; the stage converts pointer pixels through its
 * own bounding box, so dragging works at any preview size. History snapshots are
 * pushed on gesture end / input blur, not on every pixel.
 */
export default function FrameEditor({
	photobooth,
	grid,
	onChange,
}: FrameEditorProps) {
	const stageRef = useRef<HTMLDivElement | null>(null);
	const dragRef = useRef<DragState | null>(null);
	const latestRef = useRef(photobooth);
	const historyRef = useRef<Photobooth[]>([structuredClone(photobooth)]);
	const indexRef = useRef(0);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);
	const [selected, setSelected] = useState<Selection>(null);
	const [backgroundMode, setBackgroundMode] = useState(false);

	const layoutKey = String(grid) as keyof Photobooth["layouts"];
	const layout = photobooth.layouts[layoutKey];
	const overlays = layout.overlays ?? [];
	const backgroundImage = photobooth.backgroundImage;
	const backgroundFrameImage = useFrameImage(backgroundImage);

	function heightForWidth(width: number): number {
		if (!backgroundFrameImage || backgroundFrameImage.naturalWidth <= 0) {
			return layout.height;
		}
		return (
			width *
			(backgroundFrameImage.naturalHeight / backgroundFrameImage.naturalWidth)
		);
	}

	const syncButtons = useCallback(() => {
		setCanUndo(indexRef.current > 0);
		setCanRedo(indexRef.current < historyRef.current.length - 1);
	}, []);

	// External changes (typing in the card copy fields, reset, save) start a
	// fresh history so undo never reverts fields the editor did not touch.
	useEffect(() => {
		if (latestRef.current !== photobooth) {
			latestRef.current = photobooth;
			historyRef.current = [structuredClone(photobooth)];
			indexRef.current = 0;
			syncButtons();
		}
	}, [photobooth, syncButtons]);

	function commit(value: Photobooth = latestRef.current) {
		const last = historyRef.current[indexRef.current];
		if (last && same(last, value)) return;

		const next = [
			...historyRef.current.slice(0, indexRef.current + 1),
			structuredClone(value),
		].slice(-50);
		historyRef.current = next;
		indexRef.current = next.length - 1;
		syncButtons();
	}

	function apply(value: Photobooth, commitChange = false) {
		latestRef.current = value;
		onChange(value);
		if (commitChange) commit(value);
	}

	function setLayout(nextLayout: Layout, commitChange = false) {
		const current = latestRef.current;
		apply(
			{
				...current,
				layouts: { ...current.layouts, [layoutKey]: nextLayout },
			},
			commitChange,
		);
	}

	function undo() {
		if (indexRef.current <= 0) return;
		indexRef.current -= 1;
		const value = structuredClone(historyRef.current[indexRef.current]);
		latestRef.current = value;
		onChange(value);
		syncButtons();
	}

	function redo() {
		if (indexRef.current >= historyRef.current.length - 1) return;
		indexRef.current += 1;
		const value = structuredClone(historyRef.current[indexRef.current]);
		latestRef.current = value;
		onChange(value);
		syncButtons();
	}

	function resetLayout() {
		const next = structuredClone(defaultContent.photobooth.layouts[layoutKey]);
		setLayout(next, true);
	}

	function startDrag(
		event: React.PointerEvent<HTMLElement>,
		drag: Omit<DragState, "startClientX" | "startClientY">,
		selection: Selection,
	) {
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = {
			...drag,
			startClientX: event.clientX,
			startClientY: event.clientY,
		};
		setSelected(selection);
	}

	function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
		const drag = dragRef.current;
		const stage = stageRef.current;
		if (!drag || !stage) return;

		const rect = stage.getBoundingClientRect();
		const dx =
			((event.clientX - drag.startClientX) / rect.width) * layout.width;
		const dy =
			((event.clientY - drag.startClientY) / rect.height) * layout.height;
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];

		if (drag.target === "slot" && drag.startSlot && drag.index !== undefined) {
			const start = drag.startSlot;
			if (drag.mode === "move") {
				const w = start.w;
				const h = start.h;
				const x = clamp(start.x + dx, 0, currentLayout.width - w);
				const y = clamp(start.y + dy, 0, currentLayout.height - h);
				const nextSlot = {
					...start,
					x: Math.round(x),
					y: Math.round(y),
				};
				setLayout({
					...currentLayout,
					slots: currentLayout.slots.map((slot, index) =>
						index === drag.index ? nextSlot : slot,
					),
				});
				return;
			}

			const w = clamp(start.w + dx, MIN_SLOT, currentLayout.width - start.x);
			const h = clamp(start.h + dy, MIN_SLOT, currentLayout.height - start.y);
			const nextSlot = {
				...start,
				w: Math.round(w),
				h: Math.round(h),
			};
			setLayout({
				...currentLayout,
				slots: currentLayout.slots.map((slot, index) =>
					index === drag.index ? nextSlot : slot,
				),
			});
			return;
		}

		if (drag.target === "text") {
			const x = clamp(
				(drag.startTextX ?? 60) + dx,
				0,
				currentLayout.width - TEXT_WIDTH,
			);
			const y = clamp(
				(drag.startTextY ?? 0) + dy,
				0,
				currentLayout.height - TEXT_HEIGHT,
			);
			setLayout({
				...currentLayout,
				textX: Math.round(x),
				textY: Math.round(y),
			});
			return;
		}

		if (
			drag.target === "overlay" &&
			drag.startOverlay &&
			drag.index !== undefined
		) {
			const start = drag.startOverlay;
			const currentOverlays = currentLayout.overlays ?? [];
			const nextOverlay =
				drag.mode === "move"
					? {
							...start,
							x: Math.round(
								clamp(start.x + dx, 0, currentLayout.width - start.width),
							),
							y: Math.round(clamp(start.y + dy, 0, currentLayout.height - 20)),
						}
					: (() => {
							const width = clamp(start.width + dx, 40, currentLayout.width);
							return {
								...start,
								width: Math.round(width),
								x: Math.round(clamp(start.x, 0, currentLayout.width - width)),
							};
						})();

			apply({
				...current,
				layouts: {
					...current.layouts,
					[layoutKey]: {
						...currentLayout,
						overlays: currentOverlays.map((overlay, index) =>
							index === drag.index ? nextOverlay : overlay,
						),
					},
				},
			});
		}

		if (
			drag.target === "background" &&
			drag.startBackground &&
			current.backgroundImage
		) {
			const start = drag.startBackground;
			const nextWidth =
				drag.mode === "resize"
					? clamp(start.width + dx, 40, 4000)
					: start.width;
			const height = heightForWidth(nextWidth);
			const nextX = drag.mode === "resize" ? start.x : start.x + dx;
			const nextY = drag.mode === "resize" ? start.y : start.y + dy;

			apply({
				...current,
				backgroundImage: {
					...start,
					width: Math.round(nextWidth),
					x: Math.round(
						clamp(nextX, -nextWidth + 40, currentLayout.width - 40),
					),
					y: Math.round(clamp(nextY, -height + 40, currentLayout.height - 40)),
				},
			});
		}
	}

	function endDrag(event: React.PointerEvent<HTMLElement>) {
		if (!dragRef.current) return;
		dragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		commit();
	}

	function clearSelection() {
		setSelected(null);
		setBackgroundMode(false);
	}

	// A background image can cover the whole stage, so the stage's own click
	// never fires. Escape gives a reliable way to drop the selection.
	useEffect(() => {
		function handleKey(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			const target = event.target as HTMLElement | null;
			if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
			setSelected(null);
			setBackgroundMode(false);
		}

		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, []);

	function updateSlotField(index: number, key: keyof Slot, value: number) {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		const start = currentLayout.slots[index];
		if (!start) return;

		const nextSlot =
			key === "w"
				? {
						...start,
						w: clamp(value, MIN_SLOT, currentLayout.width - start.x),
					}
				: key === "h"
					? {
							...start,
							h: clamp(value, MIN_SLOT, currentLayout.height - start.y),
						}
					: key === "x"
						? {
								...start,
								x: clamp(value, 0, currentLayout.width - start.w),
							}
						: {
								...start,
								y: clamp(value, 0, currentLayout.height - start.h),
							};

		apply({
			...current,
			layouts: {
				...current.layouts,
				[layoutKey]: {
					...currentLayout,
					slots: currentLayout.slots.map((slot, slotIndex) =>
						slotIndex === index ? nextSlot : slot,
					),
				},
			},
		});
	}

	function updateTextField(key: "textX" | "textY", value: number) {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		apply({
			...current,
			layouts: {
				...current.layouts,
				[layoutKey]: {
					...currentLayout,
					[key]:
						key === "textX"
							? clamp(value, 0, currentLayout.width - TEXT_WIDTH)
							: clamp(value, 0, currentLayout.height - TEXT_HEIGHT),
				},
			},
		});
	}

	function updateOverlayField(
		index: number,
		key: "x" | "y" | "width",
		value: number,
	) {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		const currentOverlays = currentLayout.overlays ?? [];
		const target = currentOverlays[index];
		if (!target) return;

		const nextOverlay = {
			...target,
			[key]:
				key === "width"
					? clamp(value, 40, currentLayout.width)
					: key === "x"
						? clamp(value, 0, currentLayout.width - target.width)
						: clamp(value, 0, currentLayout.height - 20),
		};

		apply({
			...current,
			layouts: {
				...current.layouts,
				[layoutKey]: {
					...currentLayout,
					overlays: currentOverlays.map((overlay, overlayIndex) =>
						overlayIndex === index ? nextOverlay : overlay,
					),
				},
			},
		});
	}

	function addOverlay(url: string) {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		const currentOverlays = currentLayout.overlays ?? [];
		if (currentOverlays.length >= 5) return;

		apply(
			{
				...current,
				layouts: {
					...current.layouts,
					[layoutKey]: {
						...currentLayout,
						overlays: [
							...currentOverlays,
							{ url, x: 0, y: 0, width: currentLayout.width },
						],
					},
				},
			},
			true,
		);
	}

	function removeOverlay(index: number) {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		const currentOverlays = currentLayout.overlays ?? [];

		apply(
			{
				...current,
				layouts: {
					...current.layouts,
					[layoutKey]: {
						...currentLayout,
						overlays: currentOverlays.filter(
							(_, overlayIndex) => overlayIndex !== index,
						),
					},
				},
			},
			true,
		);
		setSelected(null);
	}

	function moveOverlay(index: number, direction: -1 | 1) {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		const currentOverlays = currentLayout.overlays ?? [];
		const target = index + direction;
		if (target < 0 || target >= currentOverlays.length) return;

		const next = [...currentOverlays];
		const [item] = next.splice(index, 1);
		if (!item) return;
		next.splice(target, 0, item);

		apply(
			{
				...current,
				layouts: {
					...current.layouts,
					[layoutKey]: { ...currentLayout, overlays: next },
				},
			},
			true,
		);
		setSelected({ type: "overlay", index: target });
	}

	function coverBackground(
		url: string,
		imageWidth: number,
		imageHeight: number,
	): PhotoboothFrame {
		const current = latestRef.current;
		const currentLayout = current.layouts[layoutKey];
		if (imageWidth <= 0 || imageHeight <= 0) {
			return { url, x: 0, y: 0, width: currentLayout.width };
		}

		const maxHeight = Math.max(
			...(["1", "2", "4"] as const).map((key) => current.layouts[key].height),
		);
		const width = Math.max(
			currentLayout.width,
			(imageWidth / imageHeight) * maxHeight,
		);
		const height = width * (imageHeight / imageWidth);

		return {
			url,
			width: Math.round(width),
			x: Math.round((currentLayout.width - width) / 2),
			y: Math.round((currentLayout.height - height) / 2),
		};
	}

	function addBackground(url: string) {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => {
			apply(
				{
					...latestRef.current,
					backgroundImage: coverBackground(
						url,
						image.naturalWidth,
						image.naturalHeight,
					),
				},
				true,
			);
			setBackgroundMode(true);
			setSelected({ type: "background" });
		};
		image.onerror = () => {
			const current = latestRef.current;
			const currentLayout = current.layouts[layoutKey];
			apply(
				{
					...current,
					backgroundImage: {
						url,
						x: 0,
						y: 0,
						width: currentLayout.width,
					},
				},
				true,
			);
		};
		image.src = url;
	}

	function removeBackground() {
		apply({ ...latestRef.current, backgroundImage: undefined }, true);
		setBackgroundMode(false);
		setSelected(null);
	}

	function resetBackgroundCover() {
		const current = latestRef.current;
		const background = current.backgroundImage;
		if (!background) return;

		const width = backgroundFrameImage?.naturalWidth ?? 0;
		const height = backgroundFrameImage?.naturalHeight ?? 0;
		apply(
			{
				...current,
				backgroundImage: coverBackground(background.url, width, height),
			},
			true,
		);
	}

	function updateBackgroundField(key: "x" | "y" | "width", value: number) {
		const current = latestRef.current;
		const background = current.backgroundImage;
		if (!background) return;

		const next =
			key === "width"
				? { ...background, width: clamp(value, 40, 4000) }
				: { ...background, [key]: value };
		const height = heightForWidth(next.width);

		apply({
			...current,
			backgroundImage: {
				...next,
				x: Math.round(clamp(next.x, -next.width + 40, layout.width - 40)),
				y: Math.round(clamp(next.y, -height + 40, layout.height - 40)),
			},
		});
	}

	const selectedSlot =
		selected?.type === "slot" ? layout.slots[selected.index] : undefined;
	const selectedOverlay =
		selected?.type === "overlay" ? overlays[selected.index] : undefined;
	const textX = layout.textX ?? 60;

	// The background resize handle must follow the image corner, not the stage.
	// Clamp it so it stays reachable when the image is panned past the edges.
	const backgroundHeight = backgroundImage
		? heightForWidth(backgroundImage.width)
		: 0;
	const backgroundRight = backgroundImage
		? clamp(backgroundImage.x + backgroundImage.width, 0, layout.width)
		: 0;
	const backgroundBottom = backgroundImage
		? clamp(backgroundImage.y + backgroundHeight, 0, layout.height)
		: 0;

	const interactionHint =
		selected?.type === "slot"
			? "Geser kotak foto untuk memindahkan; tarik pegangan di sudut kanan bawah untuk mengubah ukuran. Nilai presisi bisa diketik di panel ini."
			: selected?.type === "text"
				? "Geser blok teks langsung di kartu, atau ketik X/Y di panel ini."
				: selected?.type === "background"
					? "Geser gambar background di kartu; tarik pegangan di sudut kanan bawah gambar untuk mengubah ukurannya. Mode “Atur background” membuat seluruh area gambar tetap bisa digeser meski tertutup slot atau teks. Klik di luar gambar atau tekan Esc untuk melepas pilihan."
					: selected?.type === "overlay"
						? "Geser overlay di kartu; tarik pegangan di sudut kanan bawah untuk mengubah lebar. Tinggi mengikuti rasio gambar."
						: null;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={undo}
					disabled={!canUndo}
					className={buttonClass}
				>
					Undo
				</button>
				<button
					type="button"
					onClick={redo}
					disabled={!canRedo}
					className={buttonClass}
				>
					Redo
				</button>
				<button type="button" onClick={resetLayout} className={buttonClass}>
					Reset layout
				</button>
				{backgroundImage ? (
					<button
						type="button"
						onClick={() => {
							setBackgroundMode((value) => !value);
							setSelected({ type: "background" });
						}}
						className={buttonClass}
					>
						{backgroundMode ? "Selesai atur background" : "Atur background"}
					</button>
				) : null}
				<span className="font-body text-[10px] text-inv-muted">
					{selected?.type === "slot"
						? `Slot ${selected.index + 1}`
						: selected?.type === "text"
							? "Blok teks"
							: selected?.type === "overlay"
								? `Overlay ${selected.index + 1}`
								: selected?.type === "background"
									? "Background"
									: "Pilih elemen di kartu"}
				</span>
				{selected ? (
					<button
						type="button"
						onClick={clearSelection}
						className={buttonClass}
					>
						Batalkan pilihan
					</button>
				) : null}
			</div>

			<div
				ref={stageRef}
				onPointerDown={(event) => {
					if (event.target === event.currentTarget) {
						setSelected(null);
						setBackgroundMode(false);
					}
				}}
				className="relative mx-auto w-full max-w-[360px] touch-none select-none overflow-hidden border border-inv-rule shadow-[0_10px_28px_-24px_rgba(52,54,46,0.6)]"
				style={{
					aspectRatio: `${layout.width} / ${layout.height}`,
					backgroundColor: photobooth.background ?? "#FFFFFF",
					borderRadius: `${((photobooth.radius ?? 10) / layout.width) * 100}%`,
				}}
			>
				{backgroundImage ? (
					<button
						type="button"
						aria-label="Pilih dan geser background"
						onPointerDown={(event) =>
							startDrag(
								event,
								{
									mode: "move",
									target: "background",
									startBackground: backgroundImage,
								},
								{ type: "background" },
							)
						}
						onPointerMove={handlePointerMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
						className="absolute block cursor-move touch-none"
						style={{
							left: `${(backgroundImage.x / layout.width) * 100}%`,
							top: `${(backgroundImage.y / layout.height) * 100}%`,
							width: `${(backgroundImage.width / layout.width) * 100}%`,
						}}
					>
						<img
							src={backgroundImage.url}
							alt=""
							draggable={false}
							className={`pointer-events-none block h-auto w-full ${
								selected?.type === "background"
									? "outline outline-2 outline-inv-accent"
									: ""
							}`}
						/>
					</button>
				) : null}
				{layout.slots.map((slot, index) => {
					const active = selected?.type === "slot" && selected.index === index;
					return (
						<div
							key={`slot-${index}`}
							className="absolute"
							style={{
								left: `${(slot.x / layout.width) * 100}%`,
								top: `${(slot.y / layout.height) * 100}%`,
								width: `${(slot.w / layout.width) * 100}%`,
								height: `${(slot.h / layout.height) * 100}%`,
							}}
						>
							<button
								type="button"
								aria-label={`Pindahkan slot ${index + 1}`}
								onPointerDown={(event) =>
									startDrag(
										event,
										{ mode: "move", target: "slot", index, startSlot: slot },
										{ type: "slot", index },
									)
								}
								onPointerMove={handlePointerMove}
								onPointerUp={endDrag}
								onPointerCancel={endDrag}
								className={`absolute inset-0 flex cursor-move items-center justify-center border border-dashed bg-[linear-gradient(135deg,rgba(239,231,223,0.9),rgba(212,195,181,0.9))] font-body text-[10px] font-semibold tracking-[0.1em] text-inv-ink/50 touch-none ${
									active
										? "border-inv-accent ring-2 ring-inv-accent"
										: "border-inv-ink/30"
								}`}
							>
								FOTO {index + 1}
							</button>
							<button
								type="button"
								aria-label={`Ubah ukuran slot ${index + 1}`}
								onPointerDown={(event) =>
									startDrag(
										event,
										{ mode: "resize", target: "slot", index, startSlot: slot },
										{ type: "slot", index },
									)
								}
								onPointerMove={handlePointerMove}
								onPointerUp={endDrag}
								onPointerCancel={endDrag}
								className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border border-inv-ink bg-inv-bg"
							/>
						</div>
					);
				})}

				{overlays.map((overlay, index) => (
					<div
						key={`overlay-${index}`}
						className="absolute"
						style={{
							left: `${(overlay.x / layout.width) * 100}%`,
							top: `${(overlay.y / layout.height) * 100}%`,
							width: `${(overlay.width / layout.width) * 100}%`,
						}}
					>
						<button
							type="button"
							aria-label={`Pindahkan overlay ${index + 1}`}
							onPointerDown={(event) =>
								startDrag(
									event,
									{
										mode: "move",
										target: "overlay",
										index,
										startOverlay: overlay,
									},
									{ type: "overlay", index },
								)
							}
							onPointerMove={handlePointerMove}
							onPointerUp={endDrag}
							onPointerCancel={endDrag}
							className="block w-full cursor-move touch-none"
						>
							<img
								src={overlay.url}
								alt=""
								draggable={false}
								className={`pointer-events-none block h-auto w-full ${
									selected?.type === "overlay" && selected.index === index
										? "outline outline-2 outline-inv-accent"
										: ""
								}`}
							/>
						</button>
						<button
							type="button"
							aria-label={`Ubah lebar overlay ${index + 1}`}
							onPointerDown={(event) =>
								startDrag(
									event,
									{
										mode: "resize",
										target: "overlay",
										index,
										startOverlay: overlay,
									},
									{ type: "overlay", index },
								)
							}
							onPointerMove={handlePointerMove}
							onPointerUp={endDrag}
							onPointerCancel={endDrag}
							className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-ew-resize rounded-sm border border-inv-ink bg-inv-bg"
						/>
					</div>
				))}

				<button
					type="button"
					aria-label="Pindahkan blok teks"
					onPointerDown={(event) =>
						startDrag(
							event,
							{
								mode: "move",
								target: "text",
								startTextX: textX,
								startTextY: layout.textY,
							},
							{ type: "text" },
						)
					}
					onPointerMove={handlePointerMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
					className={`absolute flex cursor-move flex-col items-center justify-center border border-dashed bg-inv-bg/50 px-1 text-center font-body touch-none ${
						selected?.type === "text"
							? "border-inv-accent ring-2 ring-inv-accent"
							: "border-inv-ink/25"
					}`}
					style={{
						left: `${(textX / layout.width) * 100}%`,
						top: `${(layout.textY / layout.height) * 100}%`,
						width: `${(TEXT_WIDTH / layout.width) * 100}%`,
						height: `${(TEXT_HEIGHT / layout.height) * 100}%`,
					}}
				>
					<span className="text-[8px] uppercase tracking-[0.14em] text-inv-muted">
						Teks
					</span>
					<span className="w-full truncate font-display text-[10px] text-inv-ink">
						{photobooth.card.names}
					</span>
				</button>

				{backgroundMode && backgroundImage ? (
					<button
						type="button"
						aria-label="Geser background"
						onPointerDown={(event) =>
							startDrag(
								event,
								{
									mode: "move",
									target: "background",
									startBackground: backgroundImage,
								},
								{ type: "background" },
							)
						}
						onPointerMove={handlePointerMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
						className="absolute z-20 cursor-move touch-none"
						style={{
							left: `${(backgroundImage.x / layout.width) * 100}%`,
							top: `${(backgroundImage.y / layout.height) * 100}%`,
							width: `${(backgroundImage.width / layout.width) * 100}%`,
							height: `${(backgroundHeight / layout.height) * 100}%`,
						}}
					/>
				) : null}
				{backgroundImage &&
				(backgroundMode || selected?.type === "background") ? (
					<button
						type="button"
						aria-label="Ubah ukuran background"
						onPointerDown={(event) =>
							startDrag(
								event,
								{
									mode: "resize",
									target: "background",
									startBackground: backgroundImage,
								},
								{ type: "background" },
							)
						}
						onPointerMove={handlePointerMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
						className="absolute z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-sm border border-inv-ink bg-inv-bg"
						style={{
							left: `${(backgroundRight / layout.width) * 100}%`,
							top: `${(backgroundBottom / layout.height) * 100}%`,
						}}
					/>
				) : null}
			</div>

			<div className="rounded-2xl border border-inv-rule/70 bg-inv-bg px-3 py-3">
				{selectedSlot && selected?.type === "slot" ? (
					<div className="grid grid-cols-2 gap-2">
						{(["x", "y", "w", "h"] as const).map((key) => (
							<NumberField
								key={key}
								label={key.toUpperCase()}
								value={selectedSlot[key]}
								onChange={(value) =>
									updateSlotField(selected.index, key, value)
								}
								onCommit={() => commit()}
							/>
						))}
					</div>
				) : selected?.type === "text" ? (
					<div className="grid grid-cols-2 gap-2">
						<NumberField
							label="X"
							value={textX}
							onChange={(value) => updateTextField("textX", value)}
							onCommit={() => commit()}
						/>
						<NumberField
							label="Y"
							value={layout.textY}
							onChange={(value) => updateTextField("textY", value)}
							onCommit={() => commit()}
						/>
					</div>
				) : selected?.type === "background" && backgroundImage ? (
					<div className="flex flex-col gap-2">
						<div className="grid grid-cols-3 gap-2">
							<NumberField
								label="X"
								value={backgroundImage.x}
								onChange={(value) => updateBackgroundField("x", value)}
								onCommit={() => commit()}
								min={-4000}
							/>
							<NumberField
								label="Y"
								value={backgroundImage.y}
								onChange={(value) => updateBackgroundField("y", value)}
								onCommit={() => commit()}
								min={-4000}
							/>
							<NumberField
								label="LEBAR"
								value={backgroundImage.width}
								onChange={(value) => updateBackgroundField("width", value)}
								onCommit={() => commit()}
								min={40}
								max={4000}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={resetBackgroundCover}
								className={buttonClass}
							>
								Cover ulang
							</button>
							<button
								type="button"
								onClick={removeBackground}
								className="rounded-full border border-inv-accent/40 px-3 py-1.5 font-body text-[10px] text-inv-accent transition-colors hover:bg-inv-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Hapus background
							</button>
						</div>
					</div>
				) : selected?.type === "overlay" && selectedOverlay ? (
					<div className="flex flex-col gap-2">
						<div className="grid grid-cols-3 gap-2">
							<NumberField
								label="X"
								value={selectedOverlay.x}
								onChange={(value) =>
									updateOverlayField(selected.index, "x", value)
								}
								onCommit={() => commit()}
							/>
							<NumberField
								label="Y"
								value={selectedOverlay.y}
								onChange={(value) =>
									updateOverlayField(selected.index, "y", value)
								}
								onCommit={() => commit()}
							/>
							<NumberField
								label="LEBAR"
								value={selectedOverlay.width}
								onChange={(value) =>
									updateOverlayField(selected.index, "width", value)
								}
								onCommit={() => commit()}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => moveOverlay(selected.index, -1)}
								disabled={selected.index === 0}
								className={buttonClass}
							>
								Ke belakang
							</button>
							<button
								type="button"
								onClick={() => moveOverlay(selected.index, 1)}
								disabled={selected.index === overlays.length - 1}
								className={buttonClass}
							>
								Ke depan
							</button>
							<button
								type="button"
								onClick={() => removeOverlay(selected.index)}
								className="rounded-full border border-inv-accent/40 px-3 py-1.5 font-body text-[10px] text-inv-accent transition-colors hover:bg-inv-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Hapus overlay
							</button>
						</div>
					</div>
				) : (
					<p className="font-body text-[10.5px] leading-[1.6] text-inv-muted">
						Klik slot, blok teks, overlay, atau gambar background di kartu untuk
						memilih dan menggesernya. Panel di sini menampilkan field presisi.
					</p>
				)}
				{interactionHint ? (
					<p className="mt-2 border-t border-inv-rule/60 pt-2 font-body text-[10px] leading-[1.6] text-inv-muted">
						{interactionHint}
					</p>
				) : null}
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<label className="block">
					<span className="font-body text-[9.5px] font-semibold tracking-[0.12em] text-inv-muted">
						BACKGROUND
					</span>
					<input
						type="color"
						value={photobooth.background ?? "#FFFFFF"}
						onChange={(event) =>
							apply({ ...latestRef.current, background: event.target.value })
						}
						onBlur={() => commit()}
						className="mt-1 h-9 w-full rounded-xl border border-inv-rule bg-inv-bg"
					/>
				</label>
				<NumberField
					label="RADIUS"
					value={photobooth.radius ?? 10}
					onChange={(value) =>
						apply({ ...latestRef.current, radius: clamp(value, 0, 80) })
					}
					onCommit={() => commit()}
					min={0}
					max={80}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<FrameUpload
					label="Upload background"
					allowJpeg
					onUploaded={addBackground}
				/>
				{backgroundImage ? (
					<button
						type="button"
						onClick={removeBackground}
						className="rounded-full border border-inv-accent/40 px-3 py-1.5 font-body text-[10px] text-inv-accent transition-colors hover:bg-inv-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Hapus background
					</button>
				) : null}
			</div>
			<p className="font-body text-[10px] leading-[1.6] text-inv-muted">
				Background berlaku untuk semua layout. Gunakan “Atur background” untuk
				menggeser dan mengatur ukurannya.
			</p>

			<div className="flex flex-wrap items-center gap-3">
				{overlays.length < 5 ? (
					<FrameUpload onUploaded={addOverlay} />
				) : (
					<p className="font-body text-[10px] leading-[1.6] text-inv-muted">
						Maksimal 5 overlay per layout.
					</p>
				)}
				<span className="font-body text-[10px] text-inv-muted">
					{overlays.length}/5 overlay
				</span>
			</div>
		</div>
	);
}

function NumberField({
	label,
	value,
	onChange,
	onCommit,
	min = 0,
	max = 10000,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	onCommit: () => void;
	min?: number;
	max?: number;
}) {
	return (
		<label className="block">
			<span className="font-body text-[9.5px] font-semibold tracking-[0.12em] text-inv-muted">
				{label}
			</span>
			<input
				type="number"
				value={Math.round(value)}
				min={min}
				max={max}
				onChange={(event) => {
					const next = Number(event.target.value);
					if (Number.isFinite(next)) onChange(next);
				}}
				onBlur={onCommit}
				className="mt-1 w-full rounded-xl border border-inv-rule bg-inv-bg px-2.5 py-2 font-body text-[11px] text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			/>
		</label>
	);
}
