import { useMemo, useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	renderTemplate,
	TEMPLATE_MAX_LENGTH,
	TEMPLATE_VARIABLE_HELP,
	validateTemplate,
} from "#/lib/blast/template";
import type { BlastTemplateView } from "#/lib/blast/templates";
import { resetBlastTemplate, saveBlastTemplate } from "#/lib/blast/templates";
import { GUEST_SOURCE_LABELS, type GuestSource } from "#/lib/guest-import";
import type { DashboardGuest } from "#/lib/guests";
import { MessagePreview } from "./MessagePreview";

interface Props {
	initial: BlastTemplateView[];
	guests: DashboardGuest[];
}

const SAMPLE_GUEST = {
	name: "Budi Santoso",
	groupName: "Unhasy",
	address: "Jombang",
	invited: "Sekalian",
	slug: "budi-santoso",
};

export function TemplateEditor({ initial, guests }: Props) {
	const toast = useToast();
	const [templates, setTemplates] = useState<BlastTemplateView[]>(initial);
	const [source, setSource] = useState<GuestSource>("anas");
	const [sampleId, setSampleId] = useState(guests[0]?.id ?? "");
	const [busy, setBusy] = useState<"save" | "reset" | null>(null);

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
	}

	function replaceTemplate(next: BlastTemplateView) {
		setTemplates((current) =>
			current.map((item) => (item.source === next.source ? next : item)),
		);
		setBody(next.body);
	}

	function insertVariable(key: string) {
		setBody(
			(current) => `${current}${current.endsWith(" ") ? "" : " "}{${key}}`,
		);
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
				<label className="flex flex-col gap-1">
					<span className="font-body text-[10px] font-semibold tracking-[0.14em] text-inv-muted">
						TAMU CONTOH
					</span>
					<select
						value={sampleId}
						onChange={(event) => setSampleId(event.target.value)}
						className="w-full rounded-2xl border border-inv-rule bg-inv-card px-3 py-2 font-body text-[11px] text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{guests.length ? null : (
							<option value="">Tamu contoh bawaan</option>
						)}
						{guests.map((guest) => (
							<option key={guest.id} value={guest.id}>
								{guest.name}
								{guest.groupName ? ` · ${guest.groupName}` : ""}
							</option>
						))}
					</select>
				</label>

				<MessagePreview
					message={preview}
					label={`${GUEST_SOURCE_LABELS[source]} → ${sample.name}`}
				/>
			</div>
		</div>
	);
}
