import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	GUEST_SOURCE_LABELS,
	GUEST_SOURCES,
	type GuestSource,
} from "#/lib/guest-import";
import type { GuestImportPreview } from "#/lib/guests";
import { importGuests } from "#/lib/guests";

export const Route = createFileRoute("/dashboard/impor")({
	component: DashboardImport,
});

function DashboardImport() {
	const router = useRouter();
	const toast = useToast();

	const [source, setSource] = useState<GuestSource>("anas");
	const [text, setText] = useState("");
	const [preview, setPreview] = useState<GuestImportPreview | null>(null);
	const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
	const [applied, setApplied] = useState<GuestImportPreview | null>(null);

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

			if (!apply) {
				setPreview(result.preview);
				setApplied(null);
				return;
			}

			const { create, update, restore, archive } = result.preview.counts;
			toast({
				tone: "success",
				message: `Impor ${GUEST_SOURCE_LABELS[source]} selesai: ${create} baru, ${update} diperbarui, ${restore} dipulihkan, ${archive} diarsipkan.`,
			});
			setText("");
			setPreview(null);
			setApplied(result.preview);
			await router.invalidate();
		} catch {
			toast({ message: "Gagal mengimpor. Periksa koneksi lalu coba lagi." });
		} finally {
			setBusy(null);
		}
	}

	const pillClass =
		"rounded-full border px-3.5 py-1.5 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h1 className="font-display text-[26px] leading-tight">Impor Tamu</h1>
				<p className="mt-1 font-body text-[12px] leading-[1.7] text-inv-muted">
					Tempel salinan baris dari Google Sheets. Impor bersifat inkremental:
					slug yang sudah ada tidak berubah, dan nama yang hilang diarsipkan.
				</p>
			</div>

			<Link
				to="/dashboard/tamu"
				className="self-start font-body text-[11px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				← Lihat daftar tamu
			</Link>

			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					SUMBER SHEET
				</p>
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
								setApplied(null);
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
						setApplied(null);
					}}
					rows={8}
					placeholder={
						"NO\tNAMA\tKETERANGAN\tALAMAT\tDIUNDANG\tFISIK/DIGITAL\tSTATUS PENGIRIMAN"
					}
					className="mt-3 w-full resize-y rounded-2xl border border-inv-rule bg-inv-bg px-4 py-3 font-body text-[11px] leading-[1.6] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				/>

				<div className="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void runImport(false)}
						disabled={busy !== null}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
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
			</div>

			{applied ? (
				<div className="rounded-3xl border border-inv-accent/30 bg-inv-card px-5 py-4">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						IMPOR DITERAPKAN
					</p>
					<p className="mt-2 font-body text-[11px] leading-relaxed text-inv-muted">
						{applied.counts.create} baru, {applied.counts.update} diperbarui,{" "}
						{applied.counts.restore} dipulihkan, {applied.counts.archive}{" "}
						diarsipkan.
					</p>
					<Link
						to="/dashboard/tamu"
						className="mt-3 inline-block rounded-full bg-inv-accent px-4 py-2 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Buka daftar tamu
					</Link>
				</div>
			) : null}
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
