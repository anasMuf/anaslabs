import { useCallback, useEffect, useRef, useState } from "react";

/** Matches the server limit in `wall-validation.ts`. */
export const VOICE_MAX_MS = 60_000;

const MIME_CANDIDATES = [
	"audio/webm;codecs=opus",
	"audio/webm",
	"audio/mp4",
	"audio/ogg",
];

export type VoiceStatus = "idle" | "requesting" | "recording" | "ready";

export interface VoiceRecorder {
	status: VoiceStatus;
	supported: boolean;
	error: string | null;
	durationMs: number;
	blob: Blob | null;
	previewUrl: string | null;
	start: () => Promise<void>;
	stop: () => void;
	reset: () => void;
}

/**
 * Records a short voice note with `MediaRecorder`.
 *
 * The blob type is normalised to the bare container (`audio/webm`, `audio/mp4`)
 * because the server allowlist rejects `;codecs=…` parameters, and Safari only
 * records `audio/mp4`, so both need to keep working.
 */
export function useVoiceRecorder(maxMs: number = VOICE_MAX_MS): VoiceRecorder {
	const [status, setStatus] = useState<VoiceStatus>("idle");
	const [supported, setSupported] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [durationMs, setDurationMs] = useState(0);
	const [blob, setBlob] = useState<Blob | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const recorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startedAtRef = useRef(0);
	const tickRef = useRef<number | null>(null);
	const limitRef = useRef<number | null>(null);

	useEffect(() => {
		setSupported(
			typeof MediaRecorder !== "undefined" &&
				typeof navigator !== "undefined" &&
				Boolean(navigator.mediaDevices?.getUserMedia),
		);
	}, []);

	const clearTimers = useCallback(() => {
		if (tickRef.current !== null) window.clearInterval(tickRef.current);
		if (limitRef.current !== null) window.clearTimeout(limitRef.current);
		tickRef.current = null;
		limitRef.current = null;
	}, []);

	const releaseStream = useCallback(() => {
		for (const track of streamRef.current?.getTracks() ?? []) track.stop();
		streamRef.current = null;
	}, []);

	const stop = useCallback(() => {
		clearTimers();
		const recorder = recorderRef.current;
		if (recorder && recorder.state !== "inactive") recorder.stop();
	}, [clearTimers]);

	const reset = useCallback(() => {
		clearTimers();
		releaseStream();
		recorderRef.current = null;
		setPreviewUrl((current) => {
			if (current) URL.revokeObjectURL(current);
			return null;
		});
		setBlob(null);
		setDurationMs(0);
		setError(null);
		setStatus("idle");
	}, [clearTimers, releaseStream]);

	const start = useCallback(async () => {
		if (!supported) return;

		reset();
		setStatus("requesting");

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			// Safari only offers mp4; the browser reports which candidates it knows.
			const mimeType = MIME_CANDIDATES.find((candidate) =>
				MediaRecorder.isTypeSupported(candidate),
			);
			const recorder = new MediaRecorder(
				stream,
				mimeType ? { mimeType } : undefined,
			);

			chunksRef.current = [];
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const container = (recorder.mimeType || "audio/webm").split(";")[0];
				const recorded = new Blob(chunksRef.current, { type: container });
				chunksRef.current = [];
				releaseStream();

				if (recorded.size === 0) {
					setError("Rekaman kosong, coba lagi.");
					setStatus("idle");
					return;
				}

				setDurationMs((current) =>
					Math.min(maxMs, Math.max(current, Date.now() - startedAtRef.current)),
				);
				setBlob(recorded);
				setPreviewUrl(URL.createObjectURL(recorded));
				setStatus("ready");
			};

			recorderRef.current = recorder;
			startedAtRef.current = Date.now();
			recorder.start();
			setStatus("recording");
			setDurationMs(0);

			tickRef.current = window.setInterval(() => {
				setDurationMs(Math.min(maxMs, Date.now() - startedAtRef.current));
			}, 200);
			// Hard stop so a forgotten recording can never exceed the server limit.
			limitRef.current = window.setTimeout(() => stop(), maxMs);
		} catch {
			releaseStream();
			setError("Tidak bisa mengakses mikrofon. Periksa izin di browser.");
			setStatus("idle");
		}
	}, [maxMs, releaseStream, reset, stop, supported]);

	useEffect(() => {
		return () => {
			clearTimers();
			const recorder = recorderRef.current;
			if (recorder && recorder.state !== "inactive") recorder.stop();
			releaseStream();
		};
	}, [clearTimers, releaseStream]);

	return {
		status,
		supported,
		error,
		durationMs,
		blob,
		previewUrl,
		start,
		stop,
		reset,
	};
}
