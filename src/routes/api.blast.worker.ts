import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { processBlastQueue } from "#/lib/blast/worker";

/**
 * Endpoint worker antrian blast.
 *
 * Dipanggil service `worker` di docker-compose (loop tiap 30 detik) dengan
 * header `Authorization: Bearer ${BLAST_WORKER_TOKEN}`. Tanpa token yang cocok
 * endpoint ini tidak menyentuh database.
 */

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});
}

function sameToken(given: string, expected: string): boolean {
	const left = Buffer.from(given);
	const right = Buffer.from(expected);
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/blast/worker")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const expected = process.env.BLAST_WORKER_TOKEN;
				if (!expected || expected.length < 16) {
					return json(
						{ ok: false, error: "BLAST_WORKER_TOKEN belum diset." },
						503,
					);
				}

				const header = request.headers.get("authorization") ?? "";
				const given = header.startsWith("Bearer ")
					? header.slice("Bearer ".length).trim()
					: "";
				if (!sameToken(given, expected)) {
					return json({ ok: false, error: "Unauthorized." }, 401);
				}

				try {
					const report = await processBlastQueue();
					return json({ ok: true, report });
				} catch (error) {
					return json(
						{
							ok: false,
							error: error instanceof Error ? error.message : "Worker gagal.",
						},
						500,
					);
				}
			},
			GET: () => json({ ok: false, error: "Gunakan POST." }, 405),
		},
	},
});
