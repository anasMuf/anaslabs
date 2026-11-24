import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	type BlastResetSummary,
	getBlastResetSummary,
	resetBlastHistory,
	resetGuestStatuses,
} from "#/lib/blast/reset";
import type { GuestSource } from "#/lib/guest-import";

export const Route = createFileRoute("/dashboard/blast/reset")({
	loader: async () => getBlastResetSummary(),
	component: BlastResetPage,
});

const pillClass =
	"rounded-full border px-3.5 py-1.5 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

function BlastResetPage() {
	const initial = Route.useLoaderData();
	const toast = useToast();
	const [summary, setSummary] = useState<BlastResetSummary>(initial);
	const [channel, setChannel] = useState<GuestSource | "all">("all");
	const [confirm, setConfirm] = useState("");
	const [busy, setBusy] = useState<"history" | "status" | "refresh" | null>(
		null,
	);

	const ready = confirm.trim().toUpperCase() === "RESET";

	async function refresh() {
		const next = await getBlastResetSummary();
		setSummary(next);
	}

	async function handleResetStatus(target: "sent" | "opened" | "both") {
		setBusy("status");
		try {
			const result = await resetGuestStatuses({
				data: { target, channel, confirm },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({
				tone: "success",
				message: `Status direset: ${result.resetSent} terkirim, ${result.resetOpened} buka undangan.`,
			});
			setConfirm("");
			await refresh();
		} catch {
			toast({ message: "Gagal mereset status." });
		} finally {
			setBusy(null);
		}
	}

	async function handleResetHistory() {
		setBusy("history");
		try {
			const result = await resetBlastHistory({ data: { confirm } });
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({
				tone: "success",
				message: `Riwayat dihapus: ${result.deletedSends} pesan, ${result.deletedBatches} batch.`,
			});
			setConfirm("");
			await refresh();
		} catch {
			toast({ message: "Gagal menghapus riwayat." });
		} finally {
			setBusy(null);
		}
	}

	async function handleRefresh() {
		setBusy("refresh");
		try {
			await refresh();
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-3xl border border-inv-accent/40 bg-inv-accent/5 px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					AREA UJI
				</p>
				<p className="mt-2 font-body text-[11px] leading-[1.7] text-inv-ink">
					Reset tidak menghapus tamu, slug, kanal, template, atau metadata OG.
					Yang dihapus hanya riwayat pengiriman dan status turunan. Ketik{" "}
					<strong className="font-semibold">RESET</strong> untuk mengaktifkan
					tombol.
				</p>
				<label className="mt-3 flex flex-col gap-1">
					<span className="font-body text-[10px] font-semibold tracking-[0.14em] text-inv-muted">
						KONFIRMASI
					</span>
					<input
						value={confirm}
						onChange={(event) => setConfirm(event.target.value.toUpperCase())}
						placeholder="RESET"
						autoComplete="off"
						className="w-40 rounded-2xl border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[11px] tracking-[0.12em] text-inv-ink uppercase placeholder:text-inv-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					/>
				</label>
			</div>

			<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						RINGKASAN SEKARANG
					</p>
					<button
						type="button"
						onClick={() => void handleRefresh()}
						disabled={busy !== null}
						className="rounded-full border border-inv-rule px-3 py-1.5 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "refresh" ? "Memuat…" : "Muat ulang"}
					</button>
				</div>
				{summary.error ? (
					<p className="mt-2 font-body text-[11px] text-inv-accent">
						{summary.error}
					</p>
				) : null}
				<div className="mt-2 grid grid-cols-2 gap-2 font-body text-[11px] text-inv-muted sm:grid-cols-4">
					<p>
						Pesan:{" "}
						<strong className="text-inv-ink">{summary.sends.total}</strong>
					</p>
					<p>
						Terkirim:{" "}
						<strong className="text-inv-ink">{summary.sends.sent}</strong>
					</p>
					<p>
						Gagal:{" "}
						<strong className="text-inv-ink">{summary.sends.failed}</strong>
					</p>
					<p>
						Menunggu:{" "}
						<strong className="text-inv-ink">
							{summary.sends.queued + summary.sends.sending}
						</strong>
					</p>
					<p>
						Batch: <strong className="text-inv-ink">{summary.batches}</strong>
					</p>
					<p>
						Tamu “terkirim”:{" "}
						<strong className="text-inv-ink">{summary.guestsSent}</strong>
					</p>
					<p>
						Tamu “sudah buka”:{" "}
						<strong className="text-inv-ink">{summary.guestsOpened}</strong>
					</p>
				</div>
			</section>

			<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					RESET STATUS TAMU
				</p>
				<p className="mt-1 font-body text-[10.5px] leading-relaxed text-inv-muted">
					Status “terkirim” mengisi ulang kolom Status di Daftar Tamu. Status
					“buka undangan” mengosongkan jejak kunjungan tamu.
				</p>

				<div className="mt-3 flex flex-wrap gap-2">
					{(
						[
							["all", "Semua nomor"],
							["anas", "Anas"],
							["mila", "Mila"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setChannel(value)}
							className={`${pillClass} ${
								channel === value
									? "border-inv-accent bg-inv-accent text-inv-bg"
									: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
							}`}
						>
							{label}
						</button>
					))}
				</div>

				<div className="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void handleResetStatus("sent")}
						disabled={busy !== null || !ready}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Reset status terkirim
					</button>
					<button
						type="button"
						onClick={() => void handleResetStatus("opened")}
						disabled={busy !== null || !ready}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Reset status buka
					</button>
					<button
						type="button"
						onClick={() => void handleResetStatus("both")}
						disabled={busy !== null || !ready}
						className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "status" ? "Mereset…" : "Reset keduanya"}
					</button>
				</div>
			</section>

			<section className="rounded-3xl border border-inv-accent/40 bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					HAPUS RIWAYAT & ANTRIAN
				</p>
				<p className="mt-1 font-body text-[10.5px] leading-relaxed text-inv-muted">
					Menghapus seluruh baris `wa_sends` dan `blast_batches`, lalu
					membatalkan antrian yang belum diproses. Pesan yang sudah telanjur
					diterima Wablas sebelum tombol ditekan tetap bisa sampai ke tamu.
				</p>
				<button
					type="button"
					onClick={() => void handleResetHistory()}
					disabled={busy !== null || !ready}
					className="mt-3 rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					{busy === "history" ? "Menghapus…" : "Hapus riwayat & antrian"}
				</button>
			</section>
		</div>
	);
}
