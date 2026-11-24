import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SearchableSelect } from "#/components/dashboard/SearchableSelect";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	cancelQueuedSend,
	getBlastStatus,
	listBlastSends,
	resendFailedSend,
} from "#/lib/blast/queue";
import type {
	BlastSendStatus,
	BlastSendsPage,
	BlastStatusView,
} from "#/lib/blast/types";
import { processBlastQueueNow } from "#/lib/blast/worker-fn";
import { GUEST_SOURCE_LABELS } from "#/lib/guest-import";

export const Route = createFileRoute("/dashboard/blast/tracking")({
	loader: async () => {
		const [status, page] = await Promise.all([
			getBlastStatus(),
			listBlastSends({ data: { limit: 50, offset: 0 } }),
		]);
		return { status, page };
	},
	component: BlastTrackingPage,
});

const STATUS_LABELS: Record<BlastSendStatus, string> = {
	queued: "Menunggu",
	sending: "Dikirim",
	sent: "Diterima Wablas",
	failed: "Gagal",
	skipped: "Dilewati",
	canceled: "Dibatalkan",
};

function formatTime(value: string | null): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "short",
		timeStyle: "short",
		timeZone: "Asia/Jakarta",
	}).format(new Date(value));
}

function BlastTrackingPage() {
	const initial = Route.useLoaderData();
	const toast = useToast();
	const [status, setStatus] = useState<BlastStatusView>(initial.status);
	const [page, setPage] = useState<BlastSendsPage>(initial.page);
	const [batchId, setBatchId] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [query, setQuery] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function load(
		offset = 0,
		append = false,
		override: { batchId?: string; statusFilter?: string; query?: string } = {},
	) {
		setLoading(true);
		try {
			const nextBatch = override.batchId ?? batchId;
			const nextStatusFilter = override.statusFilter ?? statusFilter;
			const nextQuery = override.query ?? query;
			const [nextStatus, nextPage] = await Promise.all([
				getBlastStatus(),
				listBlastSends({
					data: {
						batchId: nextBatch,
						status: nextStatusFilter,
						query: nextQuery,
						limit: 50,
						offset,
					},
				}),
			]);
			setStatus(nextStatus);
			setPage((current) =>
				append
					? {
							rows: [...current.rows, ...nextPage.rows],
							total: nextPage.total,
							error: nextPage.error,
						}
					: nextPage,
			);
		} catch {
			toast({ message: "Gagal memuat tracking." });
		} finally {
			setLoading(false);
		}
	}

	async function handleProcess() {
		setBusyId("worker");
		try {
			const result = await processBlastQueueNow();
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({
				tone: "success",
				message: `Worker: ${result.report.sent} terkirim, ${result.report.failed} gagal, ${result.report.requeued} diulang.`,
			});
			await load(0, false);
		} catch {
			toast({ message: "Worker gagal berjalan." });
		} finally {
			setBusyId(null);
		}
	}

	async function handleResend(id: string) {
		setBusyId(id);
		try {
			const result = await resendFailedSend({ data: { id } });
			if (!result.ok) {
				toast({ message: result.error ?? "Gagal mengirim ulang." });
				return;
			}
			toast({ tone: "success", message: "Pesan dimasukkan ulang ke antrian." });
			await load(0, false);
		} catch {
			toast({ message: "Gagal mengirim ulang." });
		} finally {
			setBusyId(null);
		}
	}

	async function handleCancel(id: string) {
		setBusyId(id);
		try {
			const result = await cancelQueuedSend({ data: { id } });
			if (!result.ok) {
				toast({ message: result.error ?? "Gagal membatalkan." });
				return;
			}
			toast({ tone: "success", message: "Pesan dibatalkan." });
			await load(0, false);
		} catch {
			toast({ message: "Gagal membatalkan." });
		} finally {
			setBusyId(null);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						RINGKASAN
					</p>
					<p className="font-body text-[10.5px] text-inv-muted">
						Menunggu: {status.queued} · Diproses: {status.sending}
					</p>
				</div>

				{status.error ? (
					<p className="mt-2 font-body text-[11px] text-inv-accent">
						{status.error}
					</p>
				) : null}

				<div className="mt-3 flex flex-wrap items-center gap-2">
					<SearchableSelect
						ariaLabel="Filter batch"
						value={batchId}
						placeholder="Semua batch"
						options={[
							{ value: "", label: "Semua batch" },
							...status.batches.map((batch) => ({
								value: batch.id,
								label: `${
									batch.source === "all"
										? "Semua nomor"
										: GUEST_SOURCE_LABELS[batch.source]
								} · ${formatTime(batch.createdAt)}`,
								hint: `${batch.sent}/${batch.total}`,
							})),
						]}
						onChange={(next) => {
							setBatchId(next);
							void load(0, false, { batchId: next });
						}}
					/>

					<SearchableSelect
						ariaLabel="Filter status"
						value={statusFilter}
						placeholder="Semua status"
						options={[
							{ value: "", label: "Semua status" },
							...Object.entries(STATUS_LABELS).map(([value, label]) => ({
								value,
								label,
							})),
						]}
						onChange={(next) => {
							setStatusFilter(next);
							void load(0, false, { statusFilter: next });
						}}
					/>

					<form
						onSubmit={(event) => {
							event.preventDefault();
							void load(0, false, { query });
						}}
						className="flex min-w-0 flex-1 gap-2"
					>
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Cari nomor / ref / error"
							className="min-w-0 flex-1 rounded-2xl border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[11px] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						/>
						<button
							type="submit"
							className="rounded-full border border-inv-rule px-3 py-2 font-body text-[10.5px] text-inv-muted transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Cari
						</button>
					</form>

					<button
						type="button"
						onClick={() => void handleProcess()}
						disabled={busyId !== null}
						className="rounded-full border border-inv-ink/25 px-3.5 py-2 font-body text-[10.5px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busyId === "worker" ? "Memproses…" : "Proses sekarang"}
					</button>
				</div>

				{status.batches.length ? (
					<ul className="mt-3 flex flex-col gap-1 font-body text-[10.5px] text-inv-muted">
						{status.batches.map((batch) => (
							<li key={batch.id}>
								{batch.source === "all"
									? "Semua nomor"
									: GUEST_SOURCE_LABELS[batch.source]}{" "}
								· {batch.sent}/{batch.total} terkirim
								{batch.failed ? ` · ${batch.failed} gagal` : ""} ·{" "}
								{batch.status}
							</li>
						))}
					</ul>
				) : null}
			</section>

			{page.error ? (
				<p className="rounded-2xl border border-inv-accent/40 bg-inv-accent/5 px-4 py-3 font-body text-[11px] leading-relaxed text-inv-ink">
					{page.error}
				</p>
			) : null}

			<div className="overflow-x-auto rounded-3xl border border-inv-rule bg-inv-card">
				<table className="w-full min-w-[720px] border-collapse text-left">
					<thead className="border-b border-inv-rule font-body text-[10px] uppercase tracking-[0.12em] text-inv-muted">
						<tr>
							<th scope="col" className="px-4 py-2.5">
								Tamu
							</th>
							<th scope="col" className="px-4 py-2.5">
								Nomor
							</th>
							<th scope="col" className="px-4 py-2.5">
								Kanal
							</th>
							<th scope="col" className="px-4 py-2.5">
								Status
							</th>
							<th scope="col" className="px-4 py-2.5">
								Waktu
							</th>
							<th scope="col" className="px-4 py-2.5 text-right">
								Aksi
							</th>
						</tr>
					</thead>
					<tbody className="font-body text-[11px] text-inv-ink">
						{page.rows.map((row) => (
							<tr
								key={row.id}
								className="border-b border-inv-rule/60 align-top last:border-0"
							>
								<td className="px-4 py-3">
									<span className="block font-semibold">{row.guestName}</span>
									{row.error ? (
										<span
											title={row.error}
											className="mt-0.5 block max-w-[260px] truncate text-[10px] text-inv-accent"
										>
											{row.error}
										</span>
									) : null}
								</td>
								<td className="px-4 py-3 text-[10.5px] text-inv-muted">
									{row.phone}
								</td>
								<td className="px-4 py-3 text-[10.5px] text-inv-muted">
									{GUEST_SOURCE_LABELS[row.source]}
								</td>
								<td className="px-4 py-3 text-[10.5px] text-inv-muted">
									<span className="block">{STATUS_LABELS[row.status]}</span>
									<span className="block text-[9.5px]">
										percobaan {row.attempts}
									</span>
								</td>
								<td className="px-4 py-3 text-[10px] text-inv-muted">
									<span className="block">
										Antre {formatTime(row.queuedAt)}
									</span>
									<span className="block">Kirim {formatTime(row.sentAt)}</span>
								</td>
								<td className="px-4 py-3">
									<div className="flex justify-end gap-2">
										{row.status === "failed" ? (
											<button
												type="button"
												onClick={() => void handleResend(row.id)}
												disabled={busyId !== null}
												className="whitespace-nowrap rounded-full border border-inv-rule px-2.5 py-1 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
											>
												{busyId === row.id ? "…" : "Kirim ulang"}
											</button>
										) : null}
										{row.status === "queued" ? (
											<button
												type="button"
												onClick={() => void handleCancel(row.id)}
												disabled={busyId !== null}
												className="whitespace-nowrap rounded-full border border-inv-rule px-2.5 py-1 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
											>
												{busyId === row.id ? "…" : "Batal"}
											</button>
										) : null}
										{row.guestSlug ? (
											<a
												href={`/invitation/${row.guestSlug}`}
												target="_blank"
												rel="noreferrer"
												className="whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[10px] text-inv-muted underline-offset-2 transition-colors hover:text-inv-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
											>
												Buka
											</a>
										) : null}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{page.rows.length === 0 ? (
					<p className="px-4 py-6 font-body text-[11px] text-inv-muted">
						Belum ada pesan pada filter ini.
					</p>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{page.rows.length < page.total ? (
					<button
						type="button"
						onClick={() => void load(page.rows.length, true)}
						disabled={loading}
						className="rounded-full border border-inv-ink/25 px-4 py-2 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{loading ? "Memuat…" : "Muat lagi"}
					</button>
				) : null}
				<span className="font-body text-[10.5px] text-inv-muted">
					{page.rows.length} dari {page.total} pesan
				</span>
			</div>
		</div>
	);
}
