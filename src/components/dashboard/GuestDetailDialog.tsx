import { useEffect, useRef } from "react";
import { effectiveBlastChannel } from "#/lib/blast/attribution";
import { GUEST_SOURCE_LABELS } from "#/lib/guest-import";
import type { DashboardGuest } from "#/lib/guests";

interface GuestDetailDialogProps {
	guest: DashboardGuest;
	/** Clean invitation URL (`/invitation/<slug>`), no query string. */
	link: string;
	/** Fully rendered blast message for this guest. */
	message: string;
	onClose: () => void;
	onEdit: () => void;
	onCopyLink: () => void;
	onCopyMessage: () => void;
}

function formatDate(value: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-[110px_1fr] gap-3 py-1.5">
			<dt className="font-body text-[10px] font-semibold tracking-[0.1em] text-inv-muted">
				{label}
			</dt>
			<dd className="min-w-0 font-body text-[11.5px] leading-relaxed text-inv-ink">
				{children}
			</dd>
		</div>
	);
}

/** Read-only guest profile. Keeps the table row free of status clutter. */
export default function GuestDetailDialog({
	guest,
	link,
	message,
	onClose,
	onEdit,
	onCopyLink,
	onCopyMessage,
}: GuestDetailDialogProps) {
	const closeRef = useRef<HTMLButtonElement | null>(null);
	const digital = guest.delivery === "digital";

	useEffect(() => {
		closeRef.current?.focus();
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				tabIndex={-1}
				aria-label="Tutup"
				onClick={onClose}
				className="absolute inset-0 h-full w-full cursor-default bg-inv-ink/70 backdrop-blur-sm"
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="guest-detail-title"
				className="relative z-10 max-h-[90dvh] w-full max-w-[460px] overflow-y-auto rounded-3xl bg-inv-bg p-5 shadow-xl"
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p
							id="guest-detail-title"
							className="truncate font-display text-[20px] leading-tight"
						>
							{guest.name}
						</p>
						<p className="mt-1 font-body text-[10.5px] text-inv-muted">
							Sheet {GUEST_SOURCE_LABELS[guest.source]} · /invitation/
							{guest.slug}
						</p>
					</div>
					<button
						ref={closeRef}
						type="button"
						onClick={onClose}
						aria-label="Tutup detail"
						className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-inv-rule font-body text-[14px] leading-none text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						×
					</button>
				</div>

				<dl className="mt-3 divide-y divide-inv-rule/60">
					<DetailRow label="GRUP">{guest.groupName ?? "—"}</DetailRow>
					<DetailRow label="ALAMAT">{guest.address ?? "—"}</DetailRow>
					<DetailRow label="DIUNDANG">{guest.invited ?? "—"}</DetailRow>
					<DetailRow label="TIPE">
						{guest.delivery === "fisik" ? "Fisik" : "Digital"}
					</DetailRow>
					<DetailRow label="NO HP">{guest.phone ?? "—"}</DetailRow>
					<DetailRow label="PENGIRIM">
						{`WA ${GUEST_SOURCE_LABELS[effectiveBlastChannel(guest)]}`}
						{guest.blastChannel ? " (override)" : ""}
					</DetailRow>
					<DetailRow label="TERKIRIM">
						{guest.sent ? "Sudah ditandai terkirim" : "Belum dikirim"}
					</DetailRow>
					<DetailRow label="DIBUKA">
						{digital ? formatDate(guest.openedAt) : "—"}
					</DetailRow>
				</dl>

				{digital ? (
					<div className="mt-4">
						<p className="font-body text-[10px] font-semibold tracking-[0.12em] text-inv-muted">
							LINK UNDANGAN
						</p>
						<a
							href={link}
							target="_blank"
							rel="noreferrer"
							className="mt-1 block break-all font-body text-[11.5px] text-inv-accent underline-offset-2 hover:underline"
						>
							{link}
						</a>

						<p className="mt-4 font-body text-[10px] font-semibold tracking-[0.12em] text-inv-muted">
							PESAN WHATSAPP
						</p>
						<div className="mt-1 rounded-2xl bg-[#dcf8c6] px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(52,54,46,0.6)]">
							<p className="whitespace-pre-wrap break-words font-body text-[11.5px] leading-[1.65] text-[#1f2c22]">
								{message}
							</p>
						</div>
					</div>
				) : (
					<p className="mt-4 rounded-2xl border border-inv-rule bg-inv-card px-3 py-2.5 font-body text-[10.5px] leading-relaxed text-inv-muted">
						Undangan fisik tidak punya link digital maupun pesan WhatsApp.
					</p>
				)}

				<div className="mt-5 flex flex-wrap items-center gap-2">
					{digital ? (
						<>
							<button
								type="button"
								onClick={onCopyLink}
								className="rounded-full border border-inv-rule px-3.5 py-2 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Salin link
							</button>
							<button
								type="button"
								onClick={onCopyMessage}
								className="rounded-full border border-inv-rule px-3.5 py-2 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Salin pesan
							</button>
						</>
					) : null}
					<button
						type="button"
						onClick={onEdit}
						className="ml-auto rounded-full bg-inv-accent px-4 py-2 font-body text-[11.5px] font-semibold text-inv-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Ubah
					</button>
				</div>
			</div>
		</div>
	);
}
