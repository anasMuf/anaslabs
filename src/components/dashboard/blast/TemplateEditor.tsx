import { useMemo, useRef, useState } from "react";
import { SearchableSelect } from "#/components/dashboard/SearchableSelect";
import { useToast } from "#/components/invitation/ui/Toast";
import type { LinkPreviewInfo } from "#/lib/blast/link-preview";
import {
	renderTemplate,
	TEMPLATE_MAX_LENGTH,
	TEMPLATE_VARIABLE_HELP,
	validateTemplate,
} from "#/lib/blast/template";
import type { BlastTemplateView } from "#/lib/blast/templates";
import { resetBlastTemplate, saveBlastTemplate } from "#/lib/blast/templates";
import { GUEST_SOURCE_LABELS, type GuestSource } from "#/lib/guest-import";
import { type DashboardGuest, listGuestsPage } from "#/lib/guests";
import { MessagePreview } from "./MessagePreview";

interface Props {
	initial: BlastTemplateView[];
	guests: DashboardGuest[];
	guestTotal: number;
	linkPreview: LinkPreviewInfo;
}

const SAMPLE_GUEST = {
	name: "Budi Santoso",
	groupName: "Unhasy",
	address: "Jombang",
	invited: "Sekalian",
	slug: "budi-santoso",
};

export function TemplateEditor({
	initial,
	guests: initialGuests,
	guestTotal: initialGuestTotal,
	linkPreview,
}: Props) {
	const toast = useToast();
	const [templates, setTemplates] = useState<BlastTemplateView[]>(initial);
	const [source, setSource] = useState<GuestSource>("anas");
	const [guests, setGuests] = useState<DashboardGuest[]>(initialGuests);
	const [guestTotal, setGuestTotal] = useState(initialGuestTotal);
	const [guestQuery, setGuestQuery] = useState("");
	const [guestLoading, setGuestLoading] = useState(false);
	const [sampleId, setSampleId] = useState(initialGuests[0]?.id ?? "");
	const [busy, setBusy] = useState<"save" | "reset" | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const active =
		templates.find((template) => template.source === source) ?? templates[0];
	const [body, setBody] = useState(active?.body ?? "");

	const sample = guests.find((guest) => guest.id === sampleId) ?? SAMPLE_GUEST;
	const preview = renderTemplate(body, sample);
	const validation = useMemo(() => validateTemplate(body), [body]);
	const overLimit = preview.length > TEMPLATE_MAX_LENGTH;

	function selectSource(next: GuestSource) {
		const template = templates.find((item) => item.source === next);
		setSource(next);
		setBody(template?.body ?? "");
		setGuestQuery("");
		void loadGuests(true, "", next, false);
	}

	async function loadGuests(
		reset: boolean,
		term: string,
		nextSource: GuestSource = source,
		keepSelection = true,
	) {
		setGuestLoading(true);
		try {
			const page = await listGuestsPage({
				data: {
					limit: 30,
					offset: reset ? 0 : guests.length,
					query: term,
					delivery: "digital",
					source: nextSource,
				},
			});
			setGuests((current) => (reset ? page.rows : [...current, ...page.rows]));
			setGuestTotal(page.total);
			if (reset) {
				const stillThere = keepSelection
					? page.rows.find((guest) => guest.id === sampleId)
					: null;
				setSampleId(stillThere?.id ?? page.rows[0]?.id ?? "");
			}
		} catch {
			toast({ message: "Gagal memuat tamu contoh." });
		} finally {
			setGuestLoading(false);
		}
	}

	const guestOptions = guests.length
		? guests.map((guest) => ({
				value: guest.id,
				label: guest.name,
				hint: [
					GUEST_SOURCE_LABELS[guest.blastChannel ?? guest.source],
					guest.groupName,
					guest.phone,
				]
					.filter(Boolean)
					.join(" · "),
			}))
		: [{ value: "", label: "Tamu contoh bawaan" }];

	function replaceTemplate(next: BlastTemplateView) {
		setTemplates((current) =>
			current.map((item) => (item.source === next.source ? next : item)),
		);
		setBody(next.body);
	}

	function insertVariable(key: string) {
		const token = `{${key}}`;
		const textarea = textareaRef.current;
		const start = textarea?.selectionStart ?? body.length;
		const end = textarea?.selectionEnd ?? start;
		const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
		setBody(next);

		// Kembalikan fokus dan letakkan kursor tepat setelah variabel yang baru
		// disisipkan, agar pengetikan bisa lanjut di posisi itu.
		requestAnimationFrame(() => {
			const element = textareaRef.current;
			if (!element) return;
			const position = start + token.length;
			element.focus();
			element.setSelectionRange(position, position);
		});
	}

	async function handleSave() {
		setBusy("save");
		try {
			const result = await saveBlastTemplate({
				data: { source, body },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			replaceTemplate(result.template);
			toast({
				tone: "success",
				message: `Template ${GUEST_SOURCE_LABELS[source]} disimpan.`,
			});
		} catch {
			toast({ message: "Gagal menyimpan template." });
		} finally {
			setBusy(null);
		}
	}

	async function handleReset() {
		setBusy("reset");
		try {
			const result = await resetBlastTemplate({ data: { source } });
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			replaceTemplate(result.template);
			toast({
				tone: "success",
				message: `Template ${GUEST_SOURCE_LABELS[source]} kembali ke default.`,
			});
		} catch {
			toast({ message: "Gagal mereset template." });
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					{(["anas", "mila"] as const).map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => selectSource(option)}
							className={`rounded-full border px-3.5 py-1.5 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent ${
								source === option
									? "border-inv-accent bg-inv-accent text-inv-bg"
									: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
							}`}
						>
							Nomor {GUEST_SOURCE_LABELS[option]}
						</button>
					))}
					{active?.custom ? (
						<span className="font-body text-[10px] text-inv-muted">
							· template kustom
						</span>
					) : (
						<span className="font-body text-[10px] text-inv-muted">
							· default
						</span>
					)}
				</div>

				<label className="flex flex-col gap-1">
					<span className="font-body text-[10px] font-semibold tracking-[0.14em] text-inv-muted">
						ISI PESAN
					</span>
					<textarea
						ref={textareaRef}
						value={body}
						onChange={(event) => setBody(event.target.value)}
						rows={12}
						className="w-full resize-y rounded-2xl border border-inv-rule bg-inv-card px-4 py-3 font-body text-[11.5px] leading-[1.7] text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					/>
				</label>

				<div className="flex flex-wrap items-center gap-1.5">
					{TEMPLATE_VARIABLE_HELP.map((variable) => (
						<button
							key={variable.key}
							type="button"
							onClick={() => insertVariable(variable.key)}
							title={variable.label}
							className="rounded-full border border-inv-rule px-2.5 py-1 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							{`{${variable.key}}`}
						</button>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => void handleSave()}
						disabled={busy !== null || !validation.ok || overLimit}
						className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "save" ? "Menyimpan…" : "Simpan template"}
					</button>
					<button
						type="button"
						onClick={() => void handleReset()}
						disabled={busy !== null}
						className="rounded-full border border-inv-rule px-4 py-2.5 font-body text-[11px] text-inv-muted transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "reset" ? "Mereset…" : "Reset ke default"}
					</button>
					<span className="font-body text-[10px] text-inv-muted">
						{body.length}/{TEMPLATE_MAX_LENGTH}
					</span>
				</div>

				{!validation.ok ? (
					<p
						role="alert"
						className="font-body text-[10.5px] leading-relaxed text-inv-accent"
					>
						{validation.error}
					</p>
				) : overLimit ? (
					<p
						role="alert"
						className="font-body text-[10.5px] leading-relaxed text-inv-accent"
					>
						Pesan jadi {preview.length} karakter setelah variabel diisi;
						maksimal {TEMPLATE_MAX_LENGTH}. Ringkas template.
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-1">
					<span className="font-body text-[10px] font-semibold tracking-[0.14em] text-inv-muted">
						TAMU CONTOH
					</span>
					<SearchableSelect
						value={sampleId}
						onChange={setSampleId}
						ariaLabel="Tamu contoh"
						placeholder="Tamu contoh bawaan"
						searchPlaceholder="Cari tamu…"
						options={guestOptions}
						hasMore={guests.length < guestTotal}
						loading={guestLoading}
						onSearch={(term) => {
							if (term === guestQuery) return;
							setGuestQuery(term);
							void loadGuests(true, term);
						}}
						onLoadMore={() => void loadGuests(false, guestQuery)}
					/>
				</div>

				<MessagePreview
					message={preview}
					label={`${GUEST_SOURCE_LABELS[source]} → ${sample.name}`}
					linkPreview={linkPreview}
					linkPreviewFirst
				/>
				<p className="font-body text-[10px] leading-relaxed text-inv-muted">
					Tautan dirender sebagai kartu preview di akhir pesan, jadi label
					seperti “Buka undangan:” tidak menggantung. Letakkan{" "}
					<span className="text-inv-ink">{"{link}"}</span> di baris terakhir
					agar urutan template sama dengan pratinjau.
				</p>
			</div>
		</div>
	);
}
