import { useEffect, useRef, useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import { GUEST_SOURCE_LABELS } from "#/lib/guest-import";
import type { DashboardGuest } from "#/lib/guests";
import { archiveGuest, updateGuest } from "#/lib/guests";

interface GuestEditDialogProps {
	guest: DashboardGuest;
	/** Group suggestions collected from the rows currently loaded. */
	groups: string[];
	onClose: () => void;
	onSaved: (guest: DashboardGuest) => void;
	onArchived: (guest: DashboardGuest) => void;
}

const fieldClass =
	"mt-1 w-full rounded-xl border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[12px] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";
const labelClass =
	"font-body text-[10px] font-semibold tracking-[0.12em] text-inv-muted";

export default function GuestEditDialog({
	guest,
	groups,
	onClose,
	onSaved,
	onArchived,
}: GuestEditDialogProps) {
	const toast = useToast();
	const nameRef = useRef<HTMLInputElement | null>(null);
	const [busy, setBusy] = useState<"save" | "archive" | null>(null);
	const [confirmArchive, setConfirmArchive] = useState(false);
	const [form, setForm] = useState({
		name: guest.name,
		groupName: guest.groupName ?? "",
		address: guest.address ?? "",
		invited: guest.invited ?? "",
		delivery: guest.delivery,
		phone: guest.phone ?? "",
		blastChannel: guest.blastChannel ?? "",
	});

	useEffect(() => {
		nameRef.current?.focus();
		nameRef.current?.select();
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !busy) onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [busy, onClose]);

	function update<K extends keyof typeof form>(
		key: K,
		value: (typeof form)[K],
	) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	async function handleSave(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!form.name.trim()) {
			toast({ message: "Nama tamu tidak boleh kosong." });
			return;
		}

		setBusy("save");
		try {
			const result = await updateGuest({
				data: {
					id: guest.id,
					name: form.name,
					groupName: form.groupName,
					address: form.address,
					invited: form.invited,
					delivery: form.delivery,
					phone: form.phone,
					blastChannel: form.blastChannel,
				},
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			toast({
				tone: "success",
				message: `Data ${result.guest.name} disimpan.`,
			});
			onSaved(result.guest);
			onClose();
		} catch {
			toast({ message: "Gagal menyimpan. Periksa koneksi lalu coba lagi." });
		} finally {
			setBusy(null);
		}
	}

	async function handleArchive() {
		setBusy("archive");
		try {
			const result = await archiveGuest({ data: { id: guest.id } });
			if (!result.ok) {
				toast({ message: result.error ?? "Gagal menghapus tamu." });
				return;
			}
			toast({
				tone: "success",
				message: `${guest.name} dihapus dari daftar (link lama tetap hidup).`,
			});
			onArchived(guest);
			onClose();
		} catch {
			toast({ message: "Gagal menghapus. Periksa koneksi lalu coba lagi." });
		} finally {
			setBusy(null);
		}
	}

	const groupOptions = Array.from(new Set([...groups, guest.groupName ?? ""]))
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b));

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				tabIndex={-1}
				aria-label="Tutup"
				onClick={() => (busy ? undefined : onClose())}
				className="absolute inset-0 h-full w-full cursor-default bg-inv-ink/70 backdrop-blur-sm"
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="guest-edit-title"
				className="relative z-10 max-h-[90dvh] w-full max-w-[460px] overflow-y-auto rounded-3xl bg-inv-bg p-5 shadow-xl"
			>
				<p
					id="guest-edit-title"
					className="font-display text-[20px] leading-tight"
				>
					{confirmArchive ? "Hapus tamu ini?" : "Ubah data tamu"}
				</p>

				{confirmArchive ? (
					<>
						<p className="mt-2 font-body text-[11px] leading-[1.7] text-inv-muted">
							<strong className="font-semibold text-inv-ink">
								{guest.name}
							</strong>{" "}
							dihapus dari daftar aktif dan hitungan. Undangannya tetap bisa
							dibuka lewat{" "}
							<span className="text-inv-ink">/invitation/{guest.slug}</span>,
							atau dipulihkan dengan mengimpor ulang nama tersebut dari sheet.
						</p>
						<div className="mt-5 flex flex-col gap-2">
							<button
								type="button"
								onClick={() => void handleArchive()}
								disabled={busy !== null}
								className="flex items-center justify-center rounded-full bg-inv-accent px-4 py-3 font-body text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								{busy === "archive" ? "Menghapus…" : "Ya, hapus dari daftar"}
							</button>
							<button
								type="button"
								onClick={() => setConfirmArchive(false)}
								disabled={busy !== null}
								className="flex items-center justify-center rounded-full border border-inv-ink/25 px-4 py-3 font-body text-[12px] transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Batal
							</button>
						</div>
					</>
				) : (
					<form onSubmit={(event) => void handleSave(event)}>
						<p className="mt-1 font-body text-[10.5px] leading-[1.6] text-inv-muted">
							Link undangan{" "}
							<span className="text-inv-ink">/invitation/{guest.slug}</span>{" "}
							tidak ikut berubah.
						</p>

						<div className="mt-4 flex flex-col gap-3">
							<div>
								<label htmlFor="guest-name" className={labelClass}>
									NAMA
								</label>
								<input
									ref={nameRef}
									id="guest-name"
									value={form.name}
									onChange={(event) => update("name", event.target.value)}
									required
									maxLength={80}
									className={fieldClass}
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label htmlFor="guest-group" className={labelClass}>
										GRUP
									</label>
									<input
										id="guest-group"
										list="guest-group-options"
										value={form.groupName}
										onChange={(event) =>
											update("groupName", event.target.value)
										}
										maxLength={60}
										placeholder="tanpa grup"
										className={fieldClass}
									/>
									<datalist id="guest-group-options">
										{groupOptions.map((group) => (
											<option key={group} value={group} />
										))}
									</datalist>
								</div>
								<div>
									<label htmlFor="guest-address" className={labelClass}>
										ALAMAT
									</label>
									<input
										id="guest-address"
										value={form.address}
										onChange={(event) => update("address", event.target.value)}
										maxLength={120}
										placeholder="kota/daerah"
										className={fieldClass}
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label htmlFor="guest-invited" className={labelClass}>
										DIUNDANG
									</label>
									<input
										id="guest-invited"
										list="guest-invited-options"
										value={form.invited}
										onChange={(event) => update("invited", event.target.value)}
										maxLength={60}
										placeholder="mis. Sekalian"
										className={fieldClass}
									/>
									<datalist id="guest-invited-options">
										<option value="Sekalian" />
									</datalist>
								</div>
								<div>
									<label htmlFor="guest-delivery" className={labelClass}>
										TIPE
									</label>
									<select
										id="guest-delivery"
										value={form.delivery}
										onChange={(event) =>
											update(
												"delivery",
												event.target.value === "fisik" ? "fisik" : "digital",
											)
										}
										className={fieldClass}
									>
										<option value="digital">Digital</option>
										<option value="fisik">Fisik</option>
									</select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label htmlFor="guest-phone" className={labelClass}>
										NO HP
									</label>
									<input
										id="guest-phone"
										type="tel"
										inputMode="tel"
										value={form.phone}
										onChange={(event) => update("phone", event.target.value)}
										maxLength={20}
										placeholder="08xx…"
										className={fieldClass}
									/>
								</div>
								<div>
									<label htmlFor="guest-blast-channel" className={labelClass}>
										NOMOR PENGIRIM
									</label>
									<select
										id="guest-blast-channel"
										value={form.blastChannel}
										onChange={(event) =>
											update("blastChannel", event.target.value)
										}
										className={fieldClass}
									>
										<option value="">
											Ikut sumber ({GUEST_SOURCE_LABELS[guest.source]})
										</option>
										<option value="anas">Anas</option>
										<option value="mila">Mila</option>
									</select>
								</div>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap items-center gap-2">
							<button
								type="submit"
								disabled={busy !== null}
								className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[12px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								{busy === "save" ? "Menyimpan…" : "Simpan"}
							</button>
							<button
								type="button"
								onClick={onClose}
								disabled={busy !== null}
								className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[12px] transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Batal
							</button>
							<button
								type="button"
								onClick={() => setConfirmArchive(true)}
								disabled={busy !== null}
								className="ml-auto rounded-full px-3 py-2.5 font-body text-[11px] text-inv-accent underline-offset-2 transition-colors hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Hapus tamu
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
