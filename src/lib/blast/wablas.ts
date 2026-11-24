/**
 * Adapter HTTP Wablas.
 *
 * Semua detail endpoint/payload Wablas tinggal di sini supaya UI dan database
 * tidak ikut berubah kalau format API bergeser. Dokumentasi yang dipakai:
 * https://jogja.wablas.com/documentation/api
 *
 * - Device info: `GET {base}/api/device/info?token=...`
 * - Kirim teks: `POST {base}/api/v2/send-message`, auth `TOKEN.SECRET_KEY`,
 *   body `{ data: [{ phone, message, ref_id }] }`, maks 50 baris per request.
 */

import { prepareLinkPreviewMessage } from "./link-preview";
import { firstUrl } from "./url";

export const DEFAULT_WABLAS_BASE_URL = "https://jogja.wablas.com";
export const WABLAS_MAX_ROWS = 50;
const REQUEST_TIMEOUT_MS = 30_000;

export { firstUrl };

export interface WablasCredentials {
	baseUrl: string;
	token: string;
	secretKey: string;
}

export interface WablasDeviceInfo {
	name: string | null;
	deviceId: string | null;
	sender: string | null;
	quota: number | null;
	expiresOn: string | null;
	status: string | null;
	active: boolean | null;
}

export interface WablasSendRow {
	phone: string;
	message: string;
	refId: string;
}

export interface WablasSendResult {
	refId: string;
	messageId: string | null;
	status: string;
}

export type WablasErrorKind = "transient" | "permanent";

export class WablasError extends Error {
	readonly kind: WablasErrorKind;
	readonly httpStatus: number | null;
	readonly retryAfterSeconds: number | null;

	constructor(
		message: string,
		kind: WablasErrorKind,
		options: {
			httpStatus?: number | null;
			retryAfterSeconds?: number | null;
		} = {},
	) {
		super(message);
		this.name = "WablasError";
		this.kind = kind;
		this.httpStatus = options.httpStatus ?? null;
		this.retryAfterSeconds = options.retryAfterSeconds ?? null;
	}
}

const PERMANENT_PATTERNS = [
	/token is null/i,
	/token invalid/i,
	/device expired/i,
	/secret key invalid/i,
	/device disconnected/i,
	/device blocked/i,
	/quota is not enough/i,
	/your package not support/i,
	/parameter? (?:must|.*invalid)/i,
	/data param(?:eter)? (?:is empty|invalid)/i,
	/json data invalid/i,
	/phone number param.*invalid/i,
	/message param.*invalid/i,
];

/**
 * Error Wablas dikelompokkan supaya worker tahu mana yang boleh diulang.
 * Kredensial/kuota/perangkat/parameter tidak akan sembuh sendiri.
 */
export function classifyWablasError(
	httpStatus: number,
	message: string,
): WablasErrorKind {
	const text = String(message ?? "");
	if (PERMANENT_PATTERNS.some((pattern) => pattern.test(text))) {
		return "permanent";
	}

	if (httpStatus === 429 || httpStatus >= 500 || httpStatus === 0) {
		return "transient";
	}

	return "permanent";
}

export function normalizeBaseUrl(raw: string | null | undefined): string {
	const value = String(raw ?? "")
		.trim()
		.replace(/\/+$/, "");
	if (!value) return DEFAULT_WABLAS_BASE_URL;

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(
			"Alamat server Wablas tidak valid (contoh: https://jogja.wablas.com).",
		);
	}

	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error(
			"Alamat server Wablas harus diawali http:// atau https://.",
		);
	}

	return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

interface JsonResponse {
	status: number;
	body: Record<string, unknown>;
	retryAfterSeconds: number | null;
}

function readRetryAfter(headers: Headers, body: Record<string, unknown>) {
	const fromBody = Number(body.retry_after);
	if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;

	const header = headers.get("retry-after");
	const parsed = Number(header);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function requestJson(
	url: string,
	init: RequestInit,
	fetchImpl: typeof fetch,
): Promise<JsonResponse> {
	let response: Response;
	try {
		response = await fetchImpl(url, {
			...init,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch {
		throw new WablasError(
			"Tidak bisa menghubungi server Wablas. Periksa koneksi lalu coba lagi.",
			"transient",
			{ httpStatus: 0 },
		);
	}

	const text = await response.text();
	let body: Record<string, unknown> = {};
	if (text) {
		try {
			const parsed: unknown = JSON.parse(text);
			if (parsed && typeof parsed === "object") {
				body = parsed as Record<string, unknown>;
			}
		} catch {
			throw new WablasError(
				"Respons Wablas bukan JSON yang valid.",
				classifyWablasError(response.status, ""),
				{ httpStatus: response.status },
			);
		}
	}

	return {
		status: response.status,
		body,
		retryAfterSeconds: readRetryAfter(response.headers, body),
	};
}

function bodyMessage(body: Record<string, unknown>): string {
	const message = body.message ?? body.error;
	return typeof message === "string" ? message : "";
}

function requireSuccess(response: JsonResponse, fallback: string): void {
	const message = bodyMessage(response.body);
	if (response.status < 200 || response.status >= 300) {
		throw new WablasError(
			message || fallback,
			classifyWablasError(response.status, message),
			{
				httpStatus: response.status,
				retryAfterSeconds: response.retryAfterSeconds,
			},
		);
	}
	if (response.body.status !== true) {
		throw new WablasError(
			message || fallback,
			classifyWablasError(response.status, message),
			{
				httpStatus: response.status,
				retryAfterSeconds: response.retryAfterSeconds,
			},
		);
	}
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function linkText(message: string): string {
	return prepareLinkPreviewMessage(message).text;
}

function parseSendResults(response: JsonResponse): WablasSendResult[] {
	const data =
		response.body.data && typeof response.body.data === "object"
			? (response.body.data as Record<string, unknown>)
			: {};
	const rawMessages = data.messages;
	const list = Array.isArray(rawMessages)
		? rawMessages
		: rawMessages && typeof rawMessages === "object"
			? [rawMessages]
			: [];

	const results: WablasSendResult[] = [];
	for (const item of list) {
		if (!item || typeof item !== "object") continue;
		const message = item as Record<string, unknown>;
		const refId = readString(message.ref_id);
		if (!refId) continue;
		results.push({
			refId,
			messageId: readString(message.id),
			status: readString(message.status) ?? "pending",
		});
	}

	return results;
}

async function postBatch(
	credentials: WablasCredentials,
	path: string,
	items: unknown[],
	fetchImpl: typeof fetch,
): Promise<WablasSendResult[]> {
	const baseUrl = normalizeBaseUrl(credentials.baseUrl);
	const response = await requestJson(
		`${baseUrl}${path}`,
		{
			method: "POST",
			headers: {
				Authorization: `${credentials.token}.${credentials.secretKey}`,
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ data: items }),
		},
		fetchImpl,
	);
	requireSuccess(response, "Wablas menolak permintaan kirim pesan.");
	return parseSendResults(response);
}

export async function fetchDeviceInfo(
	credentials: WablasCredentials,
	fetchImpl: typeof fetch = fetch,
): Promise<WablasDeviceInfo> {
	const baseUrl = normalizeBaseUrl(credentials.baseUrl);
	const url = `${baseUrl}/api/device/info?token=${encodeURIComponent(credentials.token)}`;

	const response = await requestJson(
		url,
		{
			method: "GET",
			headers: { Accept: "application/json" },
		},
		fetchImpl,
	);
	requireSuccess(response, "Gagal membaca info device Wablas.");

	const data =
		response.body.data && typeof response.body.data === "object"
			? (response.body.data as Record<string, unknown>)
			: {};

	return {
		name: readString(data.name),
		deviceId: readString(data.serial) ?? readString(data.device),
		sender: readString(data.sender),
		quota: readNumber(data.quota),
		expiresOn: readString(data.expired_date),
		status: readString(data.status),
		active: typeof data.active === "boolean" ? data.active : null,
	};
}

export async function sendMessages(
	credentials: WablasCredentials,
	rows: WablasSendRow[],
	fetchImpl: typeof fetch = fetch,
): Promise<WablasSendResult[]> {
	if (!rows.length) return [];
	if (rows.length > WABLAS_MAX_ROWS) {
		throw new WablasError(
			`Maksimal ${WABLAS_MAX_ROWS} pesan per request Wablas.`,
			"permanent",
		);
	}

	const textRows: WablasSendRow[] = [];
	const linkRows: Array<{ row: WablasSendRow; link: string }> = [];
	for (const row of rows) {
		const link = firstUrl(row.message);
		if (link) linkRows.push({ row, link });
		else textRows.push(row);
	}

	const results: WablasSendResult[] = [];

	if (textRows.length) {
		results.push(
			...(await postBatch(
				credentials,
				"/api/v2/send-message",
				textRows.map((row) => ({
					phone: row.phone,
					message: row.message,
					ref_id: row.refId,
				})),
				fetchImpl,
			)),
		);
	}

	if (linkRows.length) {
		try {
			results.push(
				...(await postBatch(
					credentials,
					"/api/v2/send-link",
					linkRows.map(({ row, link }) => ({
						phone: row.phone,
						text: linkText(row.message),
						link,
						ref_id: row.refId,
					})),
					fetchImpl,
				)),
			);
		} catch (error) {
			// Transien tetap dilempar supaya worker mengulang, bukan mengirim dobel
			// tanpa preview. Format link yang ditolak dikirim sebagai teks biasa.
			if (error instanceof WablasError && error.kind === "transient") {
				throw error;
			}
			results.push(
				...(await postBatch(
					credentials,
					"/api/v2/send-message",
					linkRows.map(({ row }) => ({
						phone: row.phone,
						message: row.message,
						ref_id: row.refId,
					})),
					fetchImpl,
				)),
			);
		}
	}

	return results;
}
