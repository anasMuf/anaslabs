import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchableSelect } from "#/components/dashboard/SearchableSelect";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	autoGuestId,
	CONTACT_ROW_MAX,
	type ContactGuest,
	type ContactMatrix,
	type MatchSuggestion,
	type ParsedContact,
	type PhoneUpdateAction,
	parseContactMatrix,
	parseCsvMatrix,
	phoneUpdateAction,
	suggestGuestMatches,
} from "#/lib/contact-import";
import { GUEST_SOURCE_LABELS, type GuestSource } from "#/lib/guest-import";
import {
	applyGuestPhones,
	type GuestOption,
	listGuestOptions,
} from "#/lib/guests";

interface RowState {
	key: string;
	name: string;
	phones: string[];
	/** Number chosen for this contact (defaults to the first parsed one). */
	phone: string;
	guestId: string;
	/** User opted to overwrite a different existing number. */
	overwrite: boolean;
}

interface ParseInfo {
	fileName: string;
	skipped: number;
	truncated: boolean;
}

const STATUS_LABEL: Record<PhoneUpdateAction, string> = {
	fill: "Akan diisi",
	overwrite: "Akan ditimpa",
	skip: "Konflik — dilewati",
	same: "Sudah sama",
	none: "—",
};

function buildRows(
	contacts: ParsedContact[],
	guests: ContactGuest[],
): RowState[] {
	return contacts.map((contact) => {
		const suggestions = suggestGuestMatches(contact.name, guests);
		return {
			key: `${contact.rowNumber}-${contact.name}`,
			name: contact.name,
			phones: contact.phones,
			phone: contact.phones[0] ?? "",
			guestId: autoGuestId(suggestions),
			overwrite: false,
		};
	});
}

function guestLabel(guest: ContactGuest): string {
	return `${guest.name} · ${GUEST_SOURCE_LABELS[guest.source]}`;
}

export default function ContactImportPanel({
	source,
}: {
	/** Sheet chosen in the import panel above; scopes the matching guest list. */
	source: GuestSource;
}) {
	const toast = useToast();
	const fileRef = useRef<HTMLInputElement | null>(null);

	const [guests, setGuests] = useState<GuestOption[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [contacts, setContacts] = useState<ParsedContact[]>([]);
	const [rows, setRows] = useState<RowState[]>([]);
	const [info, setInfo] = useState<ParseInfo | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);
	const [busy, setBusy] = useState<"parse" | "apply" | null>(null);
	const [pasted, setPasted] = useState("");

	const scopedGuests = useMemo(
		() => (guests ?? []).filter((guest) => guest.source === source),
		[guests, source],
	);

	const guestById = useMemo(() => {
		const map = new Map<string, ContactGuest>();
		for (const guest of scopedGuests) map.set(guest.id, guest);
		return map;
	}, [scopedGuests]);

	const suggestionsByName = useMemo(() => {
		const map = new Map<string, MatchSuggestion[]>();
		for (const contact of contacts) {
			map.set(contact.name, suggestGuestMatches(contact.name, scopedGuests));
		}
		return map;
	}, [contacts, scopedGuests]);

	// Re-match whenever the sheet or the guest data changes: selections that no
	// longer belong to the chosen sheet are dropped instead of silently kept.
	useEffect(() => {
		if (!contacts.length) return;
		setRows(buildRows(contacts, scopedGuests));
	}, [contacts, scopedGuests]);

	useEffect(() => {
		let alive = true;
		listGuestOptions()
			.then((options) => {
				if (alive) setGuests(options);
			})
			.catch((error: unknown) => {
				if (alive)
					setLoadError(
						error instanceof Error
							? error.message
							: "Gagal memuat daftar tamu.",
					);
			});
		return () => {
			alive = false;
		};
	}, []);

	const applyParsed = useCallback((matrix: ContactMatrix, fileName: string) => {
		const parsed = parseContactMatrix(matrix);
		if (!parsed.contacts.length) {
			setParseError(
				"Tidak ada baris dengan nama dan nomor yang bisa dibaca dari file itu.",
			);
			setContacts([]);
			setRows([]);
			setInfo(null);
			return;
		}
		setParseError(null);
		setRows([]);
		setContacts(parsed.contacts);
		setInfo({
			fileName,
			skipped: parsed.skipped,
			truncated: parsed.truncated,
		});
	}, []);

	async function handleFile(file: File) {
		setBusy("parse");
		setParseError(null);
		try {
			let matrix: ContactMatrix;
			if (/\.xlsx$/i.test(file.name)) {
				const { readSheet } = await import("read-excel-file/browser");
				matrix = await readSheet(file);
			} else {
				matrix = parseCsvMatrix(await file.text());
			}
			applyParsed(matrix, file.name);
		} catch {
			setParseError("Gagal membaca file. Pastikan formatnya CSV atau .xlsx.");
		} finally {
			setBusy(null);
		}
	}

	function handlePaste() {
		if (!pasted.trim()) {
			setParseError("Tempel dulu baris CSV kontak.");
			return;
		}
		applyParsed(parseCsvMatrix(pasted), "tempelan");
	}

	function updateRow(key: string, patch: Partial<RowState>) {
		setRows((current) =>
			current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
		);
	}

	function reset() {
		setContacts([]);
		setRows([]);
		setInfo(null);
		setParseError(null);
		setPasted("");
	}

	const targetCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const row of rows) {
			if (!row.guestId) continue;
			counts.set(row.guestId, (counts.get(row.guestId) ?? 0) + 1);
		}
		return counts;
	}, [rows]);

	const evaluated = useMemo(
		() =>
			rows.map((row) => {
				const guest = row.guestId ? guestById.get(row.guestId) : undefined;
				const duplicate = Boolean(
					row.guestId && (targetCounts.get(row.guestId) ?? 0) > 1,
				);
				const action: PhoneUpdateAction = guest
					? phoneUpdateAction(guest.phone, row.phone, row.overwrite)
					: "none";
				return { row, guest, duplicate, action };
			}),
		[rows, guestById, targetCounts],
	);

	const pending = evaluated.filter(
		(entry) =>
			entry.guest &&
			!entry.duplicate &&
			(entry.action === "fill" || entry.action === "overwrite"),
	);
	const duplicateCount = evaluated.filter((entry) => entry.duplicate).length;
	const fillCount = evaluated.filter((entry) => entry.action === "fill").length;
	const overwriteCount = evaluated.filter(
		(entry) => entry.action === "overwrite",
	).length;
	const skipCount = evaluated.filter(
		(entry) => entry.action === "skip" && entry.guest,
	).length;
	const unmatchedCount = evaluated.filter((entry) => !entry.guest).length;

	async function apply() {
		if (!pending.length) return;
		setBusy("apply");
		try {
			const result = await applyGuestPhones({
				data: {
					entries: pending.map((entry) => ({
						id: entry.row.guestId,
						phone: entry.row.phone,
					})),
				},
			});

			const failedIds = new Set(result.failed.map((failure) => failure.id));
			const byId = new Map(pending.map((entry) => [entry.row.guestId, entry]));
			setGuests((current) =>
				current
					? current.map((guest) => {
							const entry = byId.get(guest.id);
							if (!entry || failedIds.has(guest.id)) return guest;
							return { ...guest, phone: entry.row.phone };
						})
					: current,
			);

			if (result.failed.length) {
				toast({
					message: `${result.updated} nomor tersimpan, ${result.failed.length} gagal. ${result.failed[0]?.error ?? ""}`,
				});
			} else {
				toast({
					tone: "success",
					message: `${result.updated} nomor WhatsApp tersimpan.`,
				});
			}
		} catch {
			toast({
				message: "Gagal menyimpan nomor. Periksa koneksi lalu coba lagi.",
			});
		} finally {
			setBusy(null);
		}
	}

	const pillClass =
		"rounded-full border border-inv-rule px-3.5 py-1.5 font-body text-[10.5px] text-inv-ink transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

	return (
		<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
			<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
				IMPOR KONTAK — NAMA + NOMOR
			</p>
			<p className="mt-2 font-body text-[11px] leading-relaxed text-inv-muted">
				Unggah ekspor kontak (Google Contacts <code>.xlsx</code> atau CSV berisi
				kolom nama &amp; nomor). File dibaca di browser dan tidak dikirim ke
				server. Hanya nomor yang Anda konfirmasi yang disimpan; nama, grup, dan
				slug tamu tidak berubah.
			</p>

			{loadError ? (
				<p className="mt-3 rounded-2xl border border-inv-accent/30 bg-inv-bg px-3 py-2 font-body text-[10.5px] text-inv-accent">
					{loadError}
				</p>
			) : null}

			<input
				ref={fileRef}
				type="file"
				accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				className="sr-only"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void handleFile(file);
					event.target.value = "";
				}}
			/>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					disabled={busy !== null || !guests}
					className="rounded-full bg-inv-accent px-4 py-2 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					{busy === "parse" ? "Membaca…" : "Pilih file CSV / .xlsx"}
				</button>
				{rows.length ? (
					<button type="button" onClick={reset} className={pillClass}>
						Kosongkan
					</button>
				) : null}
			</div>

			<details className="mt-3">
				<summary className="cursor-pointer font-body text-[10.5px] text-inv-muted hover:text-inv-ink">
					atau tempel CSV
				</summary>
				<textarea
					value={pasted}
					onChange={(event) => setPasted(event.target.value)}
					rows={4}
					placeholder={"Name,Phone\nBudi,0812-3456-7890"}
					className="mt-2 w-full resize-y rounded-2xl border border-inv-rule bg-inv-bg px-4 py-3 font-body text-[11px] leading-[1.6] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				/>
				<button
					type="button"
					onClick={handlePaste}
					disabled={busy !== null || !guests}
					className={`mt-2 ${pillClass}`}
				>
					Baca tempelan
				</button>
			</details>

			{parseError ? (
				<p className="mt-3 rounded-2xl border border-inv-accent/30 bg-inv-bg px-3 py-2 font-body text-[10.5px] leading-relaxed text-inv-accent">
					{parseError}
				</p>
			) : null}

			{info ? (
				<div className="mt-4 flex flex-col gap-1 font-body text-[10.5px] text-inv-muted">
					<p>
						<span className="text-inv-ink">{rows.length}</span> kontak cocok
						dari {info.fileName}. {info.skipped} baris dilewati (tanpa
						nama/nomor).
					</p>
					{info.truncated ? (
						<p className="text-inv-accent">
							File lebih dari {CONTACT_ROW_MAX} baris; hanya bagian pertama yang
							dibaca.
						</p>
					) : null}
					<p>
						<span className="text-inv-ink">{fillCount}</span> akan diisi ·{" "}
						<span className="text-inv-ink">{overwriteCount}</span> ditimpa ·{" "}
						{skipCount} konflik dilewati · {unmatchedCount} belum dipilih
						{duplicateCount > 0 ? ` · ${duplicateCount} ganda` : ""}
					</p>
				</div>
			) : null}

			{rows.length ? (
				<>
					<div className="mt-3 overflow-x-auto rounded-2xl border border-inv-rule bg-inv-bg">
						<table className="w-full min-w-[640px] border-collapse">
							<thead>
								<tr className="border-b border-inv-rule text-left font-body text-[9.5px] font-semibold uppercase tracking-[0.1em] text-inv-muted">
									<th className="px-3 py-2">Kontak</th>
									<th className="px-3 py-2">Nomor</th>
									<th className="px-3 py-2">Tamu</th>
									<th className="px-3 py-2">Status</th>
								</tr>
							</thead>
							<tbody className="font-body text-[11px] text-inv-ink">
								{evaluated.map(({ row, guest, duplicate, action }) => {
									const suggestions = suggestionsByName.get(row.name) ?? [];
									const suggestedIds = new Set(
										suggestions.map((suggestion) => suggestion.guestId),
									);
									const options = [
										{ value: "", label: "— Belum dipilih —" },
										...suggestions.flatMap((suggestion) => {
											const option = guestById.get(suggestion.guestId);
											return option
												? [
														{
															value: option.id,
															label: guestLabel(option),
															hint: suggestion.ambiguous
																? "ambil keputusan"
																: `saran ${suggestion.score}`,
														},
													]
												: [];
										}),
										...scopedGuests
											.filter((option) => !suggestedIds.has(option.id))
											.map((option) => ({
												value: option.id,
												label: guestLabel(option),
												hint: option.phone ? "ada nomor" : undefined,
											})),
									];

									const conflicting = guest?.phone && guest.phone !== row.phone;
									const showOverwrite = Boolean(conflicting);

									return (
										<tr
											key={row.key}
											className="border-b border-inv-rule/60 align-top last:border-0"
										>
											<td className="max-w-[180px] px-3 py-2.5">
												<span className="block truncate font-semibold">
													{row.name}
												</span>
												{duplicate ? (
													<span className="mt-0.5 block text-[9.5px] text-inv-accent">
														Tamu ini dipilih lebih dari sekali
													</span>
												) : null}
											</td>
											<td className="px-3 py-2.5">
												{row.phones.length > 1 ? (
													<SearchableSelect
														ariaLabel={`Nomor untuk ${row.name}`}
														value={row.phone}
														options={row.phones.map((phone) => ({
															value: phone,
															label: phone,
														}))}
														portal
														searchable={false}
														onChange={(value) =>
															updateRow(row.key, { phone: value })
														}
													/>
												) : (
													<span className="block whitespace-nowrap text-[10.5px]">
														{row.phone}
													</span>
												)}
											</td>
											<td className="min-w-[180px] px-3 py-2.5">
												<SearchableSelect
													ariaLabel={`Pilih tamu untuk ${row.name}`}
													value={row.guestId}
													options={options}
													portal
													placeholder="Pilih tamu…"
													searchPlaceholder="Cari nama tamu…"
													onChange={(value) =>
														updateRow(row.key, {
															guestId: value,
															overwrite: false,
														})
													}
												/>
											</td>
											<td className="min-w-[150px] px-3 py-2.5">
												<span
													className={
														duplicate
															? "block text-[10.5px] text-inv-accent"
															: action === "overwrite"
																? "block text-[10.5px] text-inv-accent"
																: "block text-[10.5px] text-inv-muted"
													}
												>
													{duplicate
														? "Ganda — pilih tamu lain"
														: guest
															? STATUS_LABEL[action]
															: "Belum dipilih"}
												</span>
												{showOverwrite && !duplicate ? (
													<button
														type="button"
														onClick={() =>
															updateRow(row.key, {
																overwrite: !row.overwrite,
															})
														}
														className="mt-1 font-body text-[10px] text-inv-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
													>
														{row.overwrite ? "Lewati saja" : "Timpa nomor"}
													</button>
												) : null}
												{guest?.phone &&
												row.phone &&
												guest.phone !== row.phone ? (
													<span className="mt-0.5 block text-[9.5px] text-inv-muted">
														sekarang: {guest.phone}
													</span>
												) : null}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<div className="mt-3 flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => void apply()}
							disabled={busy !== null || !pending.length || duplicateCount > 0}
							className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							{busy === "apply"
								? "Menyimpan…"
								: `Terapkan ${pending.length} nomor`}
						</button>
						{duplicateCount > 0 ? (
							<p className="font-body text-[10px] leading-relaxed text-inv-accent">
								Selesaikan tamu yang dipilih ganda dulu.
							</p>
						) : null}
					</div>
				</>
			) : null}
		</div>
	);
}
