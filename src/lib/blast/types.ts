import type { GuestSource } from "../guest-import";

/** Data kanal yang aman dikirim ke browser (tanpa token/secret). */
export interface BlastChannelView {
	source: GuestSource;
	label: string;
	baseUrl: string;
	senderPhone: string | null;
	deviceId: string | null;
	enabled: boolean;
	configured: boolean;
	/** 4 karakter terakhir token; null bila belum diisi/tidak terbaca. */
	tokenHint: string | null;
	/** Cipher ada tetapi tidak bisa didekripsi (mis. session secret berganti). */
	needsReentry: boolean;
	status: string | null;
	quota: number | null;
	expiresOn: string | null;
	lastCheckedAt: string | null;
}

export interface BlastChannelsResult {
	channels: BlastChannelView[];
	error: string | null;
}

export type BlastChannelResult =
	| { ok: true; channel: BlastChannelView }
	| { ok: false; error: string };

export type BlastSendStatus =
	| "queued"
	| "sending"
	| "sent"
	| "failed"
	| "skipped"
	| "canceled";

export type BlastBatchStatus = "queued" | "running" | "completed" | "canceled";

export interface BlastBatchView {
	id: string;
	source: GuestSource | "all";
	status: BlastBatchStatus;
	total: number;
	sent: number;
	failed: number;
	createdAt: string;
	finishedAt: string | null;
}

export interface BlastSendView {
	id: string;
	batchId: string | null;
	guestName: string;
	guestSlug: string | null;
	source: GuestSource;
	phone: string;
	status: BlastSendStatus;
	attempts: number;
	error: string | null;
	wablasMessageId: string | null;
	queuedAt: string;
	sentAt: string | null;
}

export interface BlastAudiencePreview {
	total: number;
	counts: Record<GuestSource, number>;
	skippedCounts: Record<string, number>;
	sampleNames: string[];
	channelError: string | null;
}

export interface BlastStatusView {
	batches: BlastBatchView[];
	queued: number;
	sending: number;
	error: string | null;
}

export interface BlastSendsPage {
	rows: BlastSendView[];
	total: number;
	error: string | null;
}

export interface QueueBlastResult {
	ok: true;
	batchId: string;
	total: number;
	counts: Record<GuestSource, number>;
}

export type QueueBlastResponse =
	| QueueBlastResult
	| { ok: false; error: string };

export interface WorkerReport {
	processed: number;
	sent: number;
	failed: number;
	requeued: number;
	byChannel: Record<GuestSource, number>;
	errors: string[];
}
