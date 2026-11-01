import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export type CameraFacing = "user" | "environment";

export type CameraStatus =
	| "idle"
	| "requesting"
	| "ready"
	| "denied"
	| "unavailable";

/** Structural subset of MediaTrackConstraints — keeps lint free of DOM type aliases. */
interface VideoConstraints {
	facingMode?: { exact: CameraFacing } | { ideal: CameraFacing };
	width?: { ideal: number };
	height?: { ideal: number };
}

export interface UseCameraStreamResult {
	videoRef: RefObject<HTMLVideoElement | null>;
	facing: CameraFacing;
	/** Mirrors the preview and the captured photo (front camera, or unknown). */
	mirrored: boolean;
	status: CameraStatus;
	switchCamera: () => void;
	stop: () => void;
}

/**
 * Owns the camera stream for the photobooth.
 *
 * `facingMode` is requested as an exact constraint first (so phones really do
 * hand over the rear camera) and falls back to `ideal` when a device cannot
 * honour it — desktop webcams and some Android browsers reject `exact`.
 */
export function useCameraStream(active: boolean): UseCameraStreamResult {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [facing, setFacing] = useState<CameraFacing>("user");
	const [mirrored, setMirrored] = useState(true);
	const [status, setStatus] = useState<CameraStatus>("idle");

	const stop = useCallback(() => {
		streamRef.current?.getTracks().forEach((track) => {
			track.stop();
		});
		streamRef.current = null;
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}, []);

	const switchCamera = useCallback(() => {
		setFacing((current) => (current === "user" ? "environment" : "user"));
	}, []);

	useEffect(() => {
		if (!active) {
			stop();
			setStatus("idle");
			return;
		}

		let cancelled = false;

		const start = async () => {
			setStatus("requesting");

			if (
				typeof navigator === "undefined" ||
				!navigator.mediaDevices?.getUserMedia
			) {
				setStatus("unavailable");
				return;
			}

			const request = (video: VideoConstraints) =>
				navigator.mediaDevices.getUserMedia({ audio: false, video });

			let stream: MediaStream;
			try {
				stream = await request({
					facingMode: { exact: facing },
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				});
			} catch (error) {
				// The effect may have been cancelled while the exact request was
				// in flight; retrying then would open a stale permission prompt.
				if (cancelled) return;

				const name = error instanceof Error ? error.name : "";
				// A denial or a missing device will not be fixed by a second
				// request; retrying only raises another permission prompt.
				if (name === "NotAllowedError" || name === "SecurityError") {
					setStatus("denied");
					return;
				}
				if (name === "NotFoundError" || name === "DevicesNotFoundError") {
					setStatus("unavailable");
					return;
				}

				try {
					stream = await request({
						facingMode: { ideal: facing },
						width: { ideal: 1920 },
						height: { ideal: 1080 },
					});
				} catch (retryError) {
					if (cancelled) return;
					const retryName = retryError instanceof Error ? retryError.name : "";
					setStatus(
						retryName === "NotAllowedError" || retryName === "SecurityError"
							? "denied"
							: "unavailable",
					);
					return;
				}
			}

			if (cancelled) {
				stream.getTracks().forEach((track) => {
					track.stop();
				});
				return;
			}

			// The `ideal` fallback may have handed back a different camera than
			// the one requested, so derive mirroring from the acquired track.
			const actualFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
			setMirrored(actualFacing ? actualFacing === "user" : facing === "user");

			streamRef.current = stream;
			const video = videoRef.current;
			if (video) {
				video.srcObject = stream;
				try {
					await video.play();
				} catch {
					// Autoplay rejection is harmless: the element still shows the
					// stream once the browser allows playback.
				}
			}
			if (!cancelled) setStatus("ready");
		};

		void start();

		return () => {
			cancelled = true;
			stop();
		};
	}, [active, facing, stop]);

	return { videoRef, facing, mirrored, status, switchCamera, stop };
}
