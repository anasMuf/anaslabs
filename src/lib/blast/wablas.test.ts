import { describe, expect, it } from "vitest";
import {
	classifyWablasError,
	fetchDeviceInfo,
	firstUrl,
	normalizeBaseUrl,
	sendMessages,
	WablasError,
} from "./wablas";

interface Call {
	url: string;
	init: RequestInit;
}

function makeFetch(
	respond: (call: Call) => Response | Promise<Response>,
	calls: Call[],
): typeof fetch {
	return (async (input: RequestInfo | URL, init?: RequestInit) => {
		const call = { url: String(input), init: init ?? {} };
		calls.push(call);
		return respond(call);
	}) as typeof fetch;
}

function json(
	body: unknown,
	status = 200,
	headers: Record<string, string> = {},
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});
}

describe("normalizeBaseUrl", () => {
	it("keeps the default when empty", () => {
		expect(normalizeBaseUrl("")).toBe("https://jogja.wablas.com");
	});

	it("strips trailing slashes", () => {
		expect(normalizeBaseUrl("https://jogja.wablas.com///")).toBe(
			"https://jogja.wablas.com",
		);
	});

	it("rejects a non-http protocol", () => {
		expect(() => normalizeBaseUrl("ftp://wablas.com")).toThrow();
	});
});

describe("classifyWablasError", () => {
	it("treats rate limits and server errors as transient", () => {
		expect(classifyWablasError(429, "Send rate limit exceeded")).toBe(
			"transient",
		);
		expect(classifyWablasError(503, "")).toBe("transient");
		expect(classifyWablasError(0, "")).toBe("transient");
	});

	it("treats credential and quota errors as permanent even on 500", () => {
		expect(classifyWablasError(500, "token invalid or device expired")).toBe(
			"permanent",
		);
		expect(classifyWablasError(500, "quota is not enough, please top up")).toBe(
			"permanent",
		);
		expect(
			classifyWablasError(
				500,
				"device disconnected, need to scan qr code again",
			),
		).toBe("permanent");
	});
});

describe("fetchDeviceInfo", () => {
	it("reads device status from the documented endpoint", async () => {
		const calls: Call[] = [];
		const fetchImpl = makeFetch(
			() =>
				json({
					status: true,
					data: {
						name: "Anas",
						serial: "A5DOYJ",
						sender: "6281234567890",
						quota: 91,
						expired_date: "2026-04-08",
						active: true,
						status: "connected",
					},
				}),
			calls,
		);

		const info = await fetchDeviceInfo(
			{
				baseUrl: "https://jogja.wablas.com/",
				token: "token-abc",
				secretKey: "secret",
			},
			fetchImpl,
		);

		expect(calls[0]?.url).toBe(
			"https://jogja.wablas.com/api/device/info?token=token-abc",
		);
		expect(info).toEqual({
			name: "Anas",
			deviceId: "A5DOYJ",
			sender: "6281234567890",
			quota: 91,
			expiresOn: "2026-04-08",
			status: "connected",
			active: true,
		});
	});

	it("throws a readable error when the device is disconnected", async () => {
		const fetchImpl = makeFetch(
			() =>
				json(
					{
						status: false,
						message: "device disconnected, need to scan qr code again",
					},
					200,
				),
			[],
		);

		await expect(
			fetchDeviceInfo(
				{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
				fetchImpl,
			),
		).rejects.toMatchObject({
			name: "WablasError",
			kind: "permanent",
		});
	});
});

describe("sendMessages", () => {
	it("sends a plain message without a URL through send-message", async () => {
		const calls: Call[] = [];
		const fetchImpl = makeFetch(
			() =>
				json({
					status: true,
					data: { messages: [{ id: "m", ref_id: "r", status: "pending" }] },
				}),
			calls,
		);

		await sendMessages(
			{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
			[{ phone: "628", message: "Halo", refId: "r" }],
			fetchImpl,
		);

		expect(calls[0]?.url).toContain("/api/v2/send-message");
	});

	it("uses send-link (with preview) when the message contains a URL", async () => {
		const calls: Call[] = [];
		const fetchImpl = makeFetch(
			() =>
				json({
					status: true,
					data: { messages: [{ id: "m", ref_id: "r", status: "pending" }] },
				}),
			calls,
		);

		await sendMessages(
			{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
			[
				{
					phone: "628",
					message: "Buka undangan: https://anaslabs.my.id/invitation/budi",
					refId: "r",
				},
			],
			fetchImpl,
		);

		expect(calls[0]?.url).toContain("/api/v2/send-link");
		expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
			data: [
				{
					phone: "628",
					text: "Buka undangan:",
					link: "https://anaslabs.my.id/invitation/budi",
					ref_id: "r",
				},
			],
		});
	});

	it("moves a dangling link label to the end for the preview URL", async () => {
		const calls: Call[] = [];
		const fetchImpl = makeFetch(
			() =>
				json({
					status: true,
					data: { messages: [{ id: "m", ref_id: "r", status: "pending" }] },
				}),
			calls,
		);

		await sendMessages(
			{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
			[
				{
					phone: "628",
					message:
						"Assalamu'alaikum\n\nBuka undangan: https://anaslabs.my.id/invitation/budi\n\nTerima kasih.",
					refId: "r",
				},
			],
			fetchImpl,
		);

		const body = JSON.parse(String(calls[0]?.init.body)) as {
			data: Array<{ text: string }>;
		};
		expect(body.data[0]?.text).toBe(
			"Assalamu'alaikum\n\nTerima kasih.\n\nBuka undangan:",
		);
	});

	it("falls back to plain text when send-link is rejected", async () => {
		const calls: Call[] = [];
		const fetchImpl = makeFetch(
			(call) =>
				call.url.includes("send-link")
					? json({ status: false, message: "your package not support" }, 400)
					: json({
							status: true,
							data: {
								messages: [{ id: "m", ref_id: "r", status: "pending" }],
							},
						}),
			calls,
		);

		const results = await sendMessages(
			{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
			[
				{
					phone: "628",
					message: "Buka https://anaslabs.my.id/invitation/budi",
					refId: "r",
				},
			],
			fetchImpl,
		);

		expect(calls.map((call) => call.url)).toEqual([
			"https://jogja.wablas.com/api/v2/send-link",
			"https://jogja.wablas.com/api/v2/send-message",
		]);
		expect(results).toEqual([
			{ refId: "r", messageId: "m", status: "pending" },
		]);
	});

	it("extracts the first URL without trailing punctuation", () => {
		expect(firstUrl("Lihat https://contoh.test/a).")).toBe(
			"https://contoh.test/a",
		);
		expect(firstUrl("tanpa tautan")).toBeNull();
	});

	it("posts the v2 payload with credentials and maps ref_id", async () => {
		const calls: Call[] = [];
		const fetchImpl = makeFetch(
			() =>
				json({
					status: true,
					data: {
						device_id: "A5DOYJ",
						quota: 90,
						messages: [
							{
								id: "msg-1",
								ref_id: "ref-1",
								phone: "628111",
								status: "pending",
							},
						],
					},
				}),
			calls,
		);

		const results = await sendMessages(
			{
				baseUrl: "https://jogja.wablas.com",
				token: "token",
				secretKey: "secret",
			},
			[{ phone: "628111", message: "Halo", refId: "ref-1" }],
			fetchImpl,
		);

		const headers = calls[0]?.init.headers as Record<string, string>;
		expect(headers.Authorization).toBe("token.secret");
		expect(calls[0]?.url).toBe("https://jogja.wablas.com/api/v2/send-message");
		expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
			data: [{ phone: "628111", message: "Halo", ref_id: "ref-1" }],
		});
		expect(results).toEqual([
			{ refId: "ref-1", messageId: "msg-1", status: "pending" },
		]);
	});

	it("marks HTTP 429 as transient with retry_after", async () => {
		const fetchImpl = makeFetch(
			() => json({ status: false, retry_after: 12 }, 429),
			[],
		);

		await expect(
			sendMessages(
				{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
				[{ phone: "628", message: "x", refId: "r" }],
				fetchImpl,
			),
		).rejects.toMatchObject({
			name: "WablasError",
			kind: "transient",
			retryAfterSeconds: 12,
		});
	});

	it("marks token errors as permanent", async () => {
		const fetchImpl = makeFetch(
			() =>
				json(
					{ status: false, message: "token invalid or device expired" },
					200,
				),
			[],
		);

		const error = await sendMessages(
			{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
			[{ phone: "628", message: "x", refId: "r" }],
			fetchImpl,
		).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(WablasError);
		expect((error as WablasError).kind).toBe("permanent");
	});

	it("refuses more than 50 rows per request", async () => {
		const rows = Array.from({ length: 51 }, (_, index) => ({
			phone: `628${index}`,
			message: "x",
			refId: `ref-${index}`,
		}));

		await expect(
			sendMessages(
				{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
				rows,
				makeFetch(() => json({ status: true }), []),
			),
		).rejects.toThrow(/50/);
	});

	it("surfaces an invalid JSON response", async () => {
		const fetchImpl = makeFetch(
			() => new Response("<html>oops</html>", { status: 200 }),
			[],
		);

		await expect(
			sendMessages(
				{ baseUrl: "https://jogja.wablas.com", token: "t", secretKey: "s" },
				[{ phone: "628", message: "x", refId: "r" }],
				fetchImpl,
			),
		).rejects.toMatchObject({ name: "WablasError" });
	});
});
