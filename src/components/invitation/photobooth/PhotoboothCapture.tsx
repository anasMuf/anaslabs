import { ArrowLeft, Camera, Images, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invitation } from "#/data/invitation";
import {
	captureFrame,
	captureImageFile,
	slotAspect,
} from "#/lib/photobooth/draw-composition";
import type {
	PhotoboothGrid,
	PhotoboothSettings,
	PhotoboothTimer,
} from "#/lib/photobooth/types";
import { useCameraStream } from "#/lib/photobooth/use-camera-stream";

interface PhotoboothCaptureProps {
	settings: PhotoboothSettings;
	grid: PhotoboothGrid;
	timer: PhotoboothTimer;
	onGridChange: (grid: PhotoboothGrid) => void;
	onTimerChange: (timer: PhotoboothTimer) => void;
	onComplete: (photos: HTMLCanvasElement[]) => void;
	onBack: () => void;
}

const GRID_OPTIONS: PhotoboothGrid[] = [1, 2, 4];
const TIMER_OPTIONS: PhotoboothTimer[] = [0, 3, 5];

/** Camera box ratio from Figma 384:2550 (390×554). */
const CAMERA_BOX_ASPECT = 390 / 554;

/**
 * Dashed capture border drawn with gradients: `border-style: dashed` does not
 * let us control dash length or gap, and `border-image` svg widths differ
 * between browsers.
 */
const DASHED_BORDER: React.CSSProperties = {
	backgroundImage: [
		"repeating-linear-gradient(to right, rgba(255,255,255,0.85) 0 16px, transparent 16px 28px)",
		"repeating-linear-gradient(to right, rgba(255,255,255,0.85) 0 16px, transparent 16px 28px)",
		"repeating-linear-gradient(to bottom, rgba(255,255,255,0.85) 0 16px, transparent 16px 28px)",
		"repeating-linear-gradient(to bottom, rgba(255,255,255,0.85) 0 16px, transparent 16px 28px)",
	].join(", "),
	backgroundSize: "100% 3px, 100% 3px, 3px 100%, 3px 100%",
	backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
	backgroundRepeat: "no-repeat",
};

export default function PhotoboothCapture({
	settings,
	grid,
	timer,
	onGridChange,
	onTimerChange,
	onComplete,
	onBack,
}: PhotoboothCaptureProps) {
	const { videoRef, mirrored, status, switchCamera } = useCameraStream(true);
	const layout = settings.layouts[grid];
	const slots = layout.slots;
	const aspect = slotAspect(layout);

	const [shots, setShots] = useState<HTMLCanvasElement[]>([]);
	const [countdown, setCountdown] = useState<number | null>(null);
	const countdownTimer = useRef<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const shotsRef = useRef<HTMLCanvasElement[]>([]);
	/** Bumped whenever the grid changes so in-flight gallery decodes are dropped. */
	const selectionEpoch = useRef(0);

	// The camera box fills the remaining viewport, so its aspect changes with the
	// device. Captures read it from the DOM at shutter time so the crop always
	// matches the box, independent of React render timing.
	const cameraBoxRef = useRef<HTMLDivElement | null>(null);

	const measureBoxAspect = useCallback(() => {
		const node = cameraBoxRef.current;
		if (!node || node.clientWidth <= 0 || node.clientHeight <= 0) {
			return CAMERA_BOX_ASPECT;
		}
		return node.clientWidth / node.clientHeight;
	}, []);

	shotsRef.current = shots;

	const clearCountdown = useCallback(() => {
		if (countdownTimer.current !== null) {
			window.clearInterval(countdownTimer.current);
			countdownTimer.current = null;
		}
		setCountdown(null);
	}, []);

	useEffect(() => clearCountdown, [clearCountdown]);

	const finishIfComplete = useCallback(
		(next: HTMLCanvasElement[]) => {
			if (next.length >= grid) {
				onComplete(next);
				return true;
			}
			return false;
		},
		[grid, onComplete],
	);

	const capture = useCallback(() => {
		const video = videoRef.current;
		const slot = slots[shotsRef.current.length];
		if (!video || !slot || video.videoWidth === 0) return;

		const photo = captureFrame(
			video,
			slot,
			layout.scale,
			mirrored,
			measureBoxAspect(),
		);
		const next = [...shotsRef.current, photo];
		setShots(next);
		finishIfComplete(next);
	}, [
		finishIfComplete,
		layout.scale,
		measureBoxAspect,
		mirrored,
		slots,
		videoRef,
	]);

	const startShot = useCallback(() => {
		if (countdown !== null) {
			clearCountdown();
			return;
		}

		if (timer === 0) {
			capture();
			return;
		}

		let remaining = timer;
		setCountdown(remaining);
		countdownTimer.current = window.setInterval(() => {
			remaining -= 1;
			if (remaining > 0) {
				setCountdown(remaining);
				return;
			}
			clearCountdown();
			capture();
		}, 1000);
	}, [capture, clearCountdown, countdown, timer]);

	const handleFile = useCallback(
		async (file: File | undefined) => {
			if (!file) return;
			const slot = slots[shotsRef.current.length];
			if (!slot) return;

			const epoch = selectionEpoch.current;
			clearCountdown();
			const photo = await captureImageFile(file, slot, layout.scale);

			// The guest changed the grid while the image was decoding: this shot
			// belongs to a layout that no longer exists.
			if (epoch !== selectionEpoch.current) return;

			const next = [...shotsRef.current, photo];
			setShots(next);
			finishIfComplete(next);
		},
		[clearCountdown, finishIfComplete, layout.scale, slots],
	);

	const handleGridChange = useCallback(
		(next: PhotoboothGrid) => {
			if (next === grid) return;
			selectionEpoch.current += 1;
			clearCountdown();
			setShots([]);
			onGridChange(next);
		},
		[clearCountdown, grid, onGridChange],
	);

	// Reacquiring the stream takes a moment; a countdown that expires in the
	// meantime would capture from a video with no frames.
	const handleSwitchCamera = useCallback(() => {
		clearCountdown();
		switchCamera();
	}, [clearCountdown, switchCamera]);

	const thumbnails = useMemo(
		() => shots.map((canvas) => canvas.toDataURL("image/jpeg", 0.6)),
		[shots],
	);

	const cameraBlocked = status === "denied" || status === "unavailable";

	// The guide must fit inside the camera box in both axes. Container query units
	// let CSS do the fitting itself: `100cqh` is the camera box height, so the
	// guide width never exceeds the box regardless of orientation.
	const guideStyle = {
		width: `min(100%, calc(100cqh * ${aspect}))`,
		aspectRatio: `${aspect}`,
	};

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-black text-white landscape:flex-row">
			<h1 className="sr-only">
				Photobooth pernikahan {invitation.cover.firstNames} &amp;{" "}
				{invitation.cover.secondNames}
			</h1>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<header className="flex shrink-0 items-center px-4 pt-3 pb-2">
					<button
						type="button"
						onClick={onBack}
						aria-label="Kembali"
						className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					>
						<ArrowLeft size={20} />
					</button>
				</header>

				<main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
					<div
						ref={cameraBoxRef}
						className="relative mx-auto h-full w-full overflow-hidden bg-neutral-800"
						style={{ containerType: "size" }}
					>
						<video
							ref={videoRef}
							muted
							playsInline
							autoPlay
							className="absolute inset-0 h-full w-full object-cover"
							style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
						/>

						{/* Capture boundary: every grid shows the exact region that ends
					    up in the card, so the preview never lies. */}
						<div
							className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
							style={{
								...DASHED_BORDER,
								...guideStyle,
								boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
							}}
						/>

						{grid > 1 ? (
							<div className="pointer-events-none absolute top-1/2 right-3 flex w-[52px] -translate-y-1/2 flex-col items-end gap-2">
								{slots.map((slot, index) => (
									<div
										key={`slot-${slot.x}-${slot.y}`}
										className="relative w-[52px] overflow-hidden rounded-[4px] border border-white/50 bg-black/50"
										style={{ aspectRatio: `${slot.w / slot.h}` }}
									>
										{thumbnails[index] ? (
											<img
												src={thumbnails[index]}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/60">
												{index + 1}
											</span>
										)}
									</div>
								))}
							</div>
						) : null}

						{status === "requesting" ? (
							<output className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center text-[11px]">
								Menyiapkan kamera…
							</output>
						) : null}

						<p className="sr-only" aria-live="polite">
							{shots.length} dari {grid} foto
						</p>

						{countdown !== null ? (
							<div
								aria-hidden="true"
								className="absolute inset-0 flex items-center justify-center bg-black/40"
							>
								<span className="text-6xl tracking-[0.08em]">{countdown}</span>
							</div>
						) : null}

						{cameraBlocked ? (
							<output className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
								<Camera size={22} />
								<p className="text-[12px] leading-relaxed">
									{status === "denied"
										? "Izin kamera ditolak."
										: "Kamera tidak tersedia."}
								</p>
								<p className="text-[10px] leading-relaxed opacity-70">
									Izinkan akses kamera di pengaturan browser, atau unggah foto
									dari galeri.
								</p>
							</output>
						) : null}
					</div>
				</main>
			</div>

			<footer
				className="w-full shrink-0 px-4 pt-1 [@media(orientation:portrait)_and_(min-width:420px)]:px-5 [@media(orientation:portrait)_and_(min-width:640px)]:px-8 [@media(orientation:portrait)_and_(min-width:900px)]:px-12 landscape:h-full landscape:w-[240px] landscape:border-l landscape:border-white/10 landscape:px-3 landscape:py-4"
				style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
			>
				<div className="mx-auto flex w-full flex-col items-center gap-6 landscape:h-full landscape:justify-center landscape:gap-5">
					<div className="flex w-full items-center justify-center gap-2 min-[360px]:gap-4 landscape:flex-col landscape:gap-4">
						<Selector
							label="grid"
							active={grid}
							options={GRID_OPTIONS}
							format={(value) => String(value)}
							onSelect={handleGridChange}
						/>
						<Selector
							label="timer"
							active={timer}
							options={TIMER_OPTIONS}
							format={(value) => (value === 0 ? "off" : `${value}s`)}
							onSelect={onTimerChange}
						/>
					</div>

					<div className="flex w-full items-center justify-between gap-[clamp(24px,calc(50vw-108px),56px)] landscape:justify-center landscape:gap-2">
						<button
							type="button"
							onClick={handleSwitchCamera}
							aria-label="Ganti kamera"
							className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>
							<RefreshCw size={22} />
						</button>

						<button
							type="button"
							onClick={startShot}
							disabled={cameraBlocked || status !== "ready"}
							aria-label={countdown !== null ? "Batalkan timer" : "Ambil foto"}
							className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/80 bg-white/15 transition-transform active:scale-95 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>
							<span className="h-16 w-16 rounded-full bg-white" />
						</button>

						{/* Uploading from the device is an alternative to capturing:
						    each picked image fills the next slot of the current grid. */}
						<button
							type="button"
							onClick={() => {
								// A pending countdown would otherwise fire while the picker
								// is open and capture an extra frame.
								clearCountdown();
								fileInputRef.current?.click();
							}}
							aria-label="Unggah dari galeri"
							className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>
							<Images size={22} />
						</button>
					</div>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={(event) => {
						void handleFile(event.target.files?.[0]);
						event.target.value = "";
					}}
				/>
			</footer>
		</div>
	);
}

interface SelectorProps<T extends number> {
	label: string;
	active: T;
	options: readonly T[];
	format: (value: T) => string;
	onSelect: (value: T) => void;
}

function Selector<T extends number>({
	label,
	active,
	options,
	format,
	onSelect,
}: SelectorProps<T>) {
	return (
		<div className="flex w-full max-w-[190px] flex-1 flex-col items-center gap-1">
			<span className="text-[12px] lowercase text-white/80">{label}</span>
			<div className="flex w-full rounded-full border border-white/50 p-[3px]">
				{options.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => onSelect(option)}
						aria-pressed={active === option}
						className={`relative min-w-[42px] flex-1 rounded-full px-2 py-2 text-[13px] transition-colors after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] ${
							active === option
								? "bg-white text-neutral-900"
								: "text-white/80 hover:text-white"
						}`}
					>
						{format(option)}
					</button>
				))}
			</div>
		</div>
	);
}
