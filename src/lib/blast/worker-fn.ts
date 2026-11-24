import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "../dashboard-session-server";
import type { WorkerReport } from "./types";
import { processBlastQueue } from "./worker";

/**
 * Tombol "Proses sekarang" untuk dashboard. Endpoint cron tetap memakai API
 * route; versi ini hanya butuh sesi dashboard, bukan token worker.
 */
export const processBlastQueueNow = createServerFn({ method: "POST" }).handler(
	async (): Promise<
		{ ok: true; report: WorkerReport } | { ok: false; error: string }
	> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
			};
		}

		try {
			const report = await processBlastQueue();
			return { ok: true, report };
		} catch (error) {
			return {
				ok: false,
				error:
					error instanceof Error ? error.message : "Worker gagal berjalan.",
			};
		}
	},
);
