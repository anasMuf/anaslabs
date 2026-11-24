import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessagePreview } from "#/components/dashboard/blast/MessagePreview";
import { SearchableSelect } from "#/components/dashboard/SearchableSelect";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	getBlastAudience,
	getBlastStatus,
	queueBlast,
} from "#/lib/blast/queue";
import { sendSingleInvitation } from "#/lib/blast/send";
import type { BlastAudiencePreview, BlastStatusView } from "#/lib/blast/types";
import { processBlastQueueNow } from "#/lib/blast/worker-fn";
import { GUEST_SOURCE_LABELS, type GuestSource } from "#/lib/guest-import";
import { type DashboardGuest, listGuestsPage } from "#/lib/guests";

export const Route = createFileRoute("/dashboard/blast/kirim")({
	loader: async () => {
		const [audience, status, guests] = await Promise.all([
			getBlastAudience({ data: { onlyUnsent: true, source: "" } }),
			getBlastStatus(),
			listGuestsPage({ data: { limit: 30, offset: 0, delivery: "digital" } }),
		]);
		return {
			audience,
			status,
			guests: guests.rows,
			guestTotal: guests.total,
		};
	},
	component: BlastSendPage,
});

const SKIP_LABELS: Record<string, string> = {
	arsip: "arsip",
	fisik: "fisik",
	"tanpa-nomor": "tanpa nomor",
	"sedang-antre": "sedang diantre",
	"sudah-terkirim": "sudah terkirim",
	"kanal-nonaktif": "kanal nonaktif",
};

function formatTime(value: string | null): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Jakarta",
	}).format(new Date(value));
}

function BlastSendPage() {
	const initial = Route.useLoaderData();
	const toast = useToast();
	const [onlyUnsent, setOnlyUnsent] = useState(true);
	const [source, setSource] = useState<GuestSource | "">("");
	const [audience, setAudience] = useState<BlastAudiencePreview>(
		initial.audience,
	);
	const [status, setStatus] = useState<BlastStatusView>(initial.status);
	const [guests, setGuests] = useState<DashboardGuest[]>(initial.guests);
	const [guestTotal, setGuestTotal] = useState(initial.guestTotal);
	const [selectedGuest, setSelectedGuest] = useState<DashboardGuest | null>(
		initial.guests[0] ?? null,
	);
	const [guestQuery, setGuestQuery] = useState("");
	const [guestLoading, setGuestLoading] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [busy, setBusy] = useState<
		"queue" | "process" | "preview" | "send" | "refresh" | null
	>(null);

	const selected = selectedGuest;
	const selectedId = selectedGuest?.id ?? "";

	async function refreshAudience(
		nextOnly: boolean,
		nextSource: GuestSource | "",
	) {
		setBusy("refresh");
		try {
			const [nextAudience, nextStatus] = await Promise.all([
				getBlastAudience({
					data: { onlyUnsent: nextOnly, source: nextSource },
				}),
				getBlastStatus(),
			]);
			setAudience(nextAudience);
			setStatus(nextStatus);
			setConfirming(false);
		} catch {
			toast({ message: "Gagal memuat audiens." });
		} finally {
			setBusy(null);
		}
	}

	async function handleQueue() {
		setBusy("queue");
		try {
			const result = await queueBlast({
				data: { onlyUnsent, source },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			setConfirming(false);
			toast({
				tone: "success",
				message: `Antrian dibuat: ${result.total} pesan (Anas ${result.counts.anas}, Mila ${result.counts.mila}).`,
			});
			const [nextStatus, nextAudience] = await Promise.all([
				getBlastStatus(),
				getBlastAudience({ data: { onlyUnsent, source } }),
			]);
			setStatus(nextStatus);
			setAudience(nextAudience);
		} catch {
			toast({ message: "Gagal membuat antrian." });
		} finally {
			setBusy(null);
		}
	}

	async function handleProcess() {
		setBusy("process");
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
			setStatus(await getBlastStatus());
		} catch {
			toast({ message: "Worker gagal berjalan." });
		} finally {
			setBusy(null);
		}
	}

	async function handlePreview() {
		if (!selected) return;
		setBusy("preview");
		try {
			const result = await sendSingleInvitation({
				data: { guestId: selected.id, dryRun: true },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			setPreview(result.message);
		} catch {
			toast({ message: "Gagal membuat pratinjau." });
		} finally {
			setBusy(null);
		}
	}

	async function handleSendSingle() {
		if (!selected) return;
		setBusy("send");
		try {
			const result = await sendSingleInvitation({
				data: { guestId: selected.id, dryRun: false },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({
				tone: "success",
				message: `Pesan untuk ${selected.name} diterima Wablas.`,
			});
			setPreview(null);
			setGuests((current) =>
				current.map((guest) =>
					guest.id === selected.id ? { ...guest, sent: true } : guest,
				),
			);
			setSelectedGuest((current) =>
				current && current.id === selected.id
					? { ...current, sent: true }
					: current,
			);
			setStatus(await getBlastStatus());
		} catch {
			toast({ message: "Gagal mengirim pesan." });
		} finally {
			setBusy(null);
		}
	}

	async function loadGuestPage(reset: boolean, term: string) {
		setGuestLoading(true);
		try {
			const page = await listGuestsPage({
				data: {
					limit: 30,
					offset: reset ? 0 : guests.length,
					query: term,
					delivery: "digital",
				},
			});
			setGuests((current) => (reset ? page.rows : [...current, ...page.rows]));
			setGuestTotal(page.total);
			if (reset) {
				const stillThere =
					selectedGuest &&
					page.rows.find((guest) => guest.id === selectedGuest.id);
				setSelectedGuest(stillThere ?? selectedGuest ?? page.rows[0] ?? null);
			}
		} catch {
			toast({ message: "Gagal memuat daftar tamu." });
		} finally {
			setGuestLoading(false);
		}
	}

	const guestOptions = guests.map((guest) => ({
		value: guest.id,
		label: guest.name,
		hint: [guest.groupName, guest.phone, guest.sent ? "terkirim" : null]
			.filter(Boolean)
			.join(" · "),
	}));
	if (selectedGuest && !guests.some((guest) => guest.id === selectedGuest.id)) {
		guestOptions.unshift({
			value: selectedGuest.id,
			label: selectedGuest.name,
			hint: [selectedGuest.groupName, selectedGuest.phone]
				.filter(Boolean)
				.join(" · "),
		});
	}

	const pillClass =
		"rounded-full border px-3.5 py-1.5 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

	return (
		<div className="flex flex-col gap-4">
			{audience.channelError ? (
				<p className="rounded-2xl border border-inv-accent/40 bg-inv-accent/5 px-4 py-3 font-body text-[11px] leading-relaxed text-inv-ink">
					{audience.channelError}
				</p>
			) : null}

			<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					KIRIM MASSAL
				</p>

				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setSource("");
							void refreshAudience(onlyUnsent, "");
						}}
						className={`${pillClass} ${
							source === ""
								? "border-inv-accent bg-inv-accent text-inv-bg"
								: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
						}`}
					>
						Semua nomor
					</button>
					{(["anas", "mila"] as const).map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => {
								setSource(option);
								void refreshAudience(onlyUnsent, option);
							}}
							className={`${pillClass} ${
								source === option
									? "border-inv-accent bg-inv-accent text-inv-bg"
									: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
							}`}
						>
							{GUEST_SOURCE_LABELS[option]}
						</button>
					))}
					<label className="ml-auto flex items-center gap-2 font-body text-[11px] text-inv-muted">
						<input
							type="checkbox"
							checked={onlyUnsent}
							onChange={(event) => {
								const next = event.target.checked;
								setOnlyUnsent(next);
								void refreshAudience(next, source);
							}}
							className="h-3.5 w-3.5"
						/>
						Hanya yang belum terkirim
					</label>
				</div>

				<div className="mt-3 grid gap-2 font-body text-[11px] text-inv-muted sm:grid-cols-3">
					<p>
						Penerima:{" "}
						<strong className="font-semibold text-inv-ink">
							{audience.total}
						</strong>
					</p>
					<p>Anas: {audience.counts.anas}</p>
					<p>Mila: {audience.counts.mila}</p>
				</div>

				{Object.values(audience.skippedCounts).some((count) => count > 0) ? (
					<p className="mt-2 font-body text-[10.5px] leading-relaxed text-inv-muted">
						Dilewati:{" "}
						{Object.entries(audience.skippedCounts)
							.filter(([, count]) => count > 0)
							.map(
								([reason, count]) =>
									`${count} ${SKIP_LABELS[reason] ?? reason}`,
							)
							.join(" · ")}
					</p>
				) : null}

				{audience.sampleNames.length ? (
					<p className="mt-1 font-body text-[10.5px] leading-relaxed text-inv-muted">
						Contoh: {audience.sampleNames.join(", ")}
						{audience.total > audience.sampleNames.length ? ", …" : ""}
					</p>
				) : null}

				<div className="mt-3 flex flex-wrap gap-2">
					{confirming ? (
						<>
							<button
								type="button"
								onClick={() => void handleQueue()}
								disabled={busy !== null}
								className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								{busy === "queue"
									? "Mengantrikan…"
									: `Ya, antrikan ${audience.total} pesan`}
							</button>
							<button
								type="button"
								onClick={() => setConfirming(false)}
								disabled={busy !== null}
								className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Batal
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={() => setConfirming(true)}
							disabled={busy !== null || audience.total === 0}
							className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Antrikan {audience.total} pesan
						</button>
					)}
					<button
						type="button"
						onClick={() => void handleProcess()}
						disabled={busy !== null}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "process" ? "Memproses…" : "Proses sekarang"}
					</button>
				</div>

				{confirming ? (
					<p className="mt-2 font-body text-[10.5px] leading-relaxed text-inv-muted">
						Antrian dibuat tanpa mengirim langsung. Worker/cron akan mengirim
						bertahap; Anda juga bisa menekan "Proses sekarang".
					</p>
				) : null}
			</section>

			<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						STATUS ANTRIAN
					</p>
					<p className="font-body text-[10.5px] text-inv-muted">
						Menunggu: {status.queued} · Diproses: {status.sending}
					</p>
				</div>
				{status.batches.length ? (
					<ul className="mt-2 flex flex-col gap-1.5 font-body text-[11px] text-inv-muted">
						{status.batches.map((batch) => (
							<li key={batch.id} className="flex flex-wrap gap-x-3">
								<span className="text-inv-ink">
									{batch.source === "all"
										? "Semua nomor"
										: GUEST_SOURCE_LABELS[batch.source]}
								</span>
								<span>{formatTime(batch.createdAt)}</span>
								<span>
									{batch.sent}/{batch.total} terkirim
									{batch.failed ? ` · ${batch.failed} gagal` : ""}
								</span>
								<span className="uppercase tracking-[0.08em]">
									{batch.status}
								</span>
							</li>
						))}
					</ul>
				) : (
					<p className="mt-2 font-body text-[11px] text-inv-muted">
						Belum ada batch.
					</p>
				)}
			</section>

			<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					KIRIM SATU TAMU
				</p>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<SearchableSelect
						className="min-w-0 flex-1"
						ariaLabel="Pilih tamu"
						value={selectedId}
						placeholder="Pilih tamu…"
						searchPlaceholder="Cari nama/nomor…"
						options={guestOptions}
						hasMore={guests.length < guestTotal}
						loading={guestLoading}
						onSearch={(term) => {
							if (term === guestQuery) return;
							setGuestQuery(term);
							void loadGuestPage(true, term);
						}}
						onLoadMore={() => void loadGuestPage(false, guestQuery)}
						onChange={(guestId) => {
							const next =
								guests.find((guest) => guest.id === guestId) ??
								(selectedGuest?.id === guestId ? selectedGuest : null);
							setSelectedGuest(next);
							setPreview(null);
						}}
					/>
					<button
						type="button"
						onClick={() => void loadGuestPage(true, guestQuery)}
						className="rounded-full border border-inv-rule px-3 py-2 font-body text-[10.5px] text-inv-muted transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{guestLoading ? "Memuat…" : "Muat ulang"}
					</button>
				</div>

				{selected ? (
					<p className="mt-2 font-body text-[10.5px] text-inv-muted">
						{selected.phone ?? "Tanpa nomor HP"} · kanal{" "}
						{GUEST_SOURCE_LABELS[selected.blastChannel ?? selected.source]}
					</p>
				) : (
					<p className="mt-2 font-body text-[11px] text-inv-muted">
						Belum ada tamu digital.
					</p>
				)}

				<div className="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void handlePreview()}
						disabled={busy !== null || !selected}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "preview" ? "Menyiapkan…" : "Pratinjau pesan"}
					</button>
					<button
						type="button"
						onClick={() => void handleSendSingle()}
						disabled={busy !== null || !selected || !selected.phone}
						className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "send" ? "Mengirim…" : "Kirim sekarang"}
					</button>
				</div>

				{preview ? (
					<div className="mt-3">
						<MessagePreview
							message={preview}
							label={selected?.name ?? "Tamu"}
						/>
					</div>
				) : null}
			</section>
		</div>
	);
}
