import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import CopyButton from "#/components/invitation/ui/CopyButton";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	GUEST_SOURCE_LABELS,
	GUEST_SOURCES,
	type GuestSource,
} from "#/lib/guest-import";
import type { DashboardGuest, GuestImportPreview } from "#/lib/guests";
import { importGuests, listGuests, setGuestSent } from "#/lib/guests";
import { SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/dashboard/tamu")({
	loader: async () => {
		// A missing migration must not blow up the page: show it as a notice so the
		// fix (run 0003_guests.sql) is right in front of the user.
		try {
			return { guests: await listGuests(), error: null as string | null };
		} catch (error) {
			return {
				guests: [] as DashboardGuest[],
				error:
					error instanceof Error ? error.message : "Gagal memuat daftar tamu.",
			};
		}
	},
	component: DashboardGuests,
});

function invitationUrl(slug: string) {
	return `${SITE_URL}/invitation/${slug}`;
}

function matchesQuery(guest: DashboardGuest, query: string) {
	if (!query) return true;
	const haystack = [
		guest.name,
		guest.groupName ?? "",
		guest.slug,
		guest.phone ?? "",
	]
		.join(" ")
		.toLowerCase();
	return haystack.includes(query);
}

function DashboardGuests() {
	const router = useRouter();
	const toast = useToast();
	const { guests, error } = Route.useLoaderData();

	const [query, setQuery] = useState("");
	const [showImport, setShowImport] = useState(guests.length === 0);
	const [source, setSource] = useState<GuestSource>("anas");
	const [text, setText] = useState("");
	const [preview, setPreview] = useState<GuestImportPreview | null>(null);
	const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
	const [savingId, setSavingId] = useState<string | null>(null);

	const active = guests.filter((guest) => !guest.archived);
	const archivedCount = guests.length - active.length;
	const counts = {
		total: active.length,
		digital: active.filter((guest) => guest.delivery === "digital").length,
		fisik: active.filter((guest) => guest.delivery === "fisik").length,
		sent: active.filter((guest) => guest.sent).length,
		opened: active.filter((guest) => guest.openedAt).length,
	};

	const filtered = active.filter((guest) =>
		matchesQuery(guest, query.trim().toLowerCase()),
	);

	async function runImport(apply: boolean) {
		if (!text.trim()) {
			toast({ message: "Tempel dulu baris tamu dari sheet." });
			return;
		}

		setBusy(apply ? "apply" : "preview");
		try {
			const result = await importGuests({ data: { source, text, apply } });
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}

			setPreview(result.preview);
			if (!apply) return;

			const { create, update, restore, archive } = result.preview.counts;
			toast({
				tone: "success",
				message: `Impor ${GUEST_SOURCE_LABELS[source]} selesai: ${create} baru, ${update} diperbarui, ${restore} dipulihkan, ${archive} diarsipkan.`,
			});
			setText("");
			setPreview(null);
			await router.invalidate();
		} catch {
			toast({ message: "Gagal mengimpor. Periksa koneksi lalu coba lagi." });
		} finally {
			setBusy(null);
		}
	}

	async function toggleSent(guest: DashboardGuest) {
		setSavingId(guest.id);
		try {
			const result = await setGuestSent({
				data: { id: guest.id, sent: !guest.sent },
			});
			if (!result.ok) {
				toast({ message: result.error ?? "Gagal menyimpan status." });
				return;
			}
			await router.invalidate();
		} catch {
			toast({ message: "Gagal menyimpan status. Coba lagi." });
		} finally {
			setSavingId(null);
		}
	}

	const pillClass =
		"rounded-full border px-3.5 py-1.5 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h1 className="font-display text-[26px] leading-tight">Daftar Tamu</h1>
				<p className="mt-1 font-body text-[12px] leading-[1.7] text-inv-muted">
					{counts.total} tamu aktif · {counts.digital} digital · {counts.fisik}{" "}
					fisik · {counts.sent} terkirim · {counts.opened} sudah membuka
					{archivedCount > 0 ? ` · ${archivedCount} diarsipkan` : ""}
				</p>
			</div>

			{error ? (
				<p className="rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 font-body text-[11px] leading-relaxed text-inv-accent">
					{error}
				</p>
			) : null}

			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<div className="flex items-center justify-between gap-3">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						IMPOR DARI SHEET
					</p>
					<button
						type="button"
						onClick={() => setShowImport((current) => !current)}
						className="font-body text-[11px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{showImport ? "Tutup" : "Buka"}
					</button>
				</div>

				{showImport ? (
					<>
						<p className="mt-2 font-body text-[11px] leading-relaxed text-inv-muted">
							Buka sheet, blok semua baris tamu termasuk baris judul kolom, lalu
							tempel di bawah. Pratinjau dulu sebelum diterapkan.
						</p>

						<div className="mt-3 flex gap-2">
							{GUEST_SOURCES.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => {
										setSource(option);
										setPreview(null);
									}}
									className={`${pillClass} ${
										source === option
											? "border-inv-accent bg-inv-accent text-inv-bg"
											: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
									}`}
								>
									Sheet {GUEST_SOURCE_LABELS[option]}
								</button>
							))}
						</div>

						<textarea
							value={text}
							onChange={(event) => {
								setText(event.target.value);
								setPreview(null);
							}}
							rows={6}
							placeholder={
								"NO\tNAMA\tKETERANGAN\tFISIK/DIGITAL\tSTATUS PENGIRIMAN"
							}
							className="mt-3 w-full resize-y rounded-2xl border border-inv-rule bg-inv-bg px-4 py-3 font-body text-[11px] leading-[1.6] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						/>

						<div className="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => void runImport(false)}
								disabled={busy !== null}
								className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								{busy === "preview" ? "Memeriksa…" : "Pratinjau"}
							</button>
							{preview ? (
								<button
									type="button"
									onClick={() => void runImport(true)}
									disabled={busy !== null}
									className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
								>
									{busy === "apply" ? "Menerapkan…" : "Terapkan"}
								</button>
							) : null}
						</div>

						{preview ? <ImportSummary preview={preview} /> : null}
					</>
				) : null}
			</div>

			<div>
				<label
					htmlFor="guest-search"
					className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent"
				>
					CARI TAMU
				</label>
				<input
					id="guest-search"
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Nama, grup, atau slug"
					className="mt-2 w-full rounded-2xl border border-inv-rule bg-inv-card px-4 py-2.5 font-body text-[12px] text-inv-ink placeholder:text-inv-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				/>

				{filtered.length === 0 ? (
					<p className="mt-4 font-body text-[12px] text-inv-muted">
						{active.length === 0
							? "Belum ada tamu. Tempel data dari sheet di atas."
							: "Tidak ada tamu yang cocok dengan pencarian."}
					</p>
				) : (
					<ul className="mt-3 flex flex-col gap-2">
						{filtered.map((guest) => (
							<li
								key={guest.id}
								className="rounded-2xl border border-inv-rule bg-inv-card px-4 py-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate font-body text-[13px] font-semibold text-inv-ink">
											{guest.name}
										</p>
										<p className="mt-0.5 truncate font-body text-[10.5px] text-inv-muted">
											{GUEST_SOURCE_LABELS[guest.source]} ·{" "}
											{guest.groupName ?? "tanpa grup"} ·{" "}
											{guest.delivery === "fisik"
												? "Fisik (tanpa link)"
												: "Digital"}
										</p>
										<p className="mt-1 font-body text-[10px] text-inv-muted">
											{guest.sent ? "Terkirim" : "Belum dikirim"} ·{" "}
											{guest.openedAt ? "Sudah buka" : "Belum buka"}
										</p>
									</div>

									<div className="flex shrink-0 flex-col items-end gap-1.5">
										{guest.delivery === "digital" ? (
											<CopyButton
												value={invitationUrl(guest.slug)}
												label="Link"
												copiedLabel="Tersalin"
											/>
										) : null}
										<button
											type="button"
											onClick={() => void toggleSent(guest)}
											disabled={savingId === guest.id}
											className="rounded-full border border-inv-rule px-2.5 py-1 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
										>
											{savingId === guest.id
												? "Menyimpan…"
												: guest.sent
													? "Batalkan"
													: "Tandai terkirim"}
										</button>
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

const CHANGE_LABEL = "font-body text-[10.5px] text-inv-muted";

function ImportSummary({ preview }: { preview: GuestImportPreview }) {
	const { counts } = preview;

	const rows = [
		{ label: "Baris terbaca", value: counts.parsed },
		{ label: "Baru", value: counts.create, names: preview.create },
		{ label: "Diperbarui", value: counts.update, names: preview.update },
		{ label: "Dipulihkan", value: counts.restore, names: preview.restore },
		{ label: "Diarsipkan", value: counts.archive, names: preview.archive },
		{ label: "Tetap", value: counts.unchanged },
	];

	return (
		<div className="mt-4 rounded-2xl border border-inv-rule bg-inv-bg px-4 py-3">
			{preview.truncated ? (
				<p className="mb-2 font-body text-[10.5px] leading-relaxed text-inv-accent">
					Tempelan lebih panjang dari batas impor; hanya baris pertama yang
					dibaca. Impor per bagian.
				</p>
			) : null}

			<ul className="flex flex-col gap-1">
				{rows.map((row) => (
					<li
						key={row.label}
						className="flex items-baseline justify-between gap-3"
					>
						<span className={CHANGE_LABEL}>{row.label}</span>
						<span className="font-body text-[11px] font-semibold text-inv-ink">
							{row.value}
						</span>
					</li>
				))}
			</ul>

			{rows
				.filter((row) => row.value > 0 && row.names && row.names.length > 0)
				.map((row) => (
					<p key={`${row.label}-names`} className={CHANGE_LABEL}>
						<span className="text-inv-ink">{row.label}:</span>{" "}
						{row.names?.join(", ")}
						{row.value > (row.names?.length ?? 0)
							? ` +${row.value - (row.names?.length ?? 0)} lagi`
							: ""}
					</p>
				))}

			{counts.skipped > 0 || counts.duplicates > 0 ? (
				<p className="mt-2 font-body text-[10px] leading-relaxed text-inv-muted">
					{counts.skipped > 0
						? `${counts.skipped} baris dilewati (kosong/no/header ulang). `
						: ""}
					{counts.duplicates > 0
						? `${counts.duplicates} nama ganda dalam tempelan digabung (yang pertama dipakai).`
						: ""}
				</p>
			) : null}
		</div>
	);
}
