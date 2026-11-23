import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ContentEditor from "#/components/dashboard/content/ContentEditor";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	getInvitationContentForDashboard,
	resetInvitationContent,
	saveInvitationContent,
} from "#/lib/invitation-content";
import { defaultContent } from "#/lib/invitation-content-default";
import type { InvitationContent } from "#/lib/invitation-content-schema";
import type { GuestSide } from "#/lib/invitation-personalization";

export const Route = createFileRoute("/dashboard/konten")({
	loader: async () => {
		try {
			const result = await getInvitationContentForDashboard();
			if (!result.ok) return { ok: false as const, error: result.error };
			return result;
		} catch (error) {
			return {
				ok: false as const,
				error: error instanceof Error ? error.message : "Gagal memuat konten.",
			};
		}
	},
	component: ContentDashboard,
});

function ContentDashboard() {
	const data = Route.useLoaderData();

	if (!data.ok) {
		return (
			<div className="rounded-3xl border border-inv-accent/30 bg-inv-card px-5 py-4">
				<h1 className="font-display text-[20px]">Konten undangan</h1>
				<p className="mt-2 font-body text-[12px] leading-[1.7] text-inv-muted">
					{data.error}
				</p>
			</div>
		);
	}

	return (
		<ContentScreen
			initialContent={data.content}
			initialUpdatedAt={data.updatedAt}
			initialUpdatedBy={data.updatedBy}
			missingTable={data.missingTable}
			invalidStored={data.invalidStored}
		/>
	);
}

const SIDE_OPTIONS: { value: GuestSide | null; label: string }[] = [
	{ value: "groom", label: "Anas" },
	{ value: "bride", label: "Mila" },
	{ value: null, label: "Netral" },
];

function ContentScreen({
	initialContent,
	initialUpdatedAt,
	initialUpdatedBy,
	missingTable,
	invalidStored,
}: {
	initialContent: InvitationContent;
	initialUpdatedAt: string | null;
	initialUpdatedBy: string | null;
	missingTable: boolean;
	invalidStored: boolean;
}) {
	const toast = useToast();
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const [content, setContent] = useState<InvitationContent>(initialContent);
	const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(
		initialUpdatedAt,
	);
	const [updatedBy, setUpdatedBy] = useState<string | null>(initialUpdatedBy);
	const [dirty, setDirty] = useState(
		invalidStored || initialUpdatedAt === null,
	);
	const [saving, setSaving] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);
	const [side, setSide] = useState<GuestSide | null>("groom");
	const [previewReady, setPreviewReady] = useState(false);

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	useEffect(() => {
		const handle = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			const type = (event.data as { type?: unknown } | null)?.type;
			if (type === "invitation:ready") setPreviewReady(true);
		};
		window.addEventListener("message", handle);
		return () => window.removeEventListener("message", handle);
	}, []);

	useEffect(() => {
		if (!previewReady) return;
		const frame = iframeRef.current;
		if (!frame?.contentWindow) return;

		const timer = window.setTimeout(() => {
			frame.contentWindow?.postMessage(
				{ type: "invitation:content", content },
				window.location.origin,
			);
			frame.contentWindow?.postMessage(
				{ type: "invitation:side", side },
				window.location.origin,
			);
		}, 150);

		return () => window.clearTimeout(timer);
	}, [content, side, previewReady]);

	function updateContent(next: InvitationContent) {
		setContent(next);
		setDirty(true);
		setErrorText(null);
	}

	async function handleSave() {
		setSaving(true);
		setErrorText(null);

		try {
			const result = await saveInvitationContent({
				data: { content, baseUpdatedAt },
			});

			if (!result.ok) {
				setErrorText(result.error);
				toast({ message: result.error });
				return;
			}

			setBaseUpdatedAt(result.updatedAt);
			setUpdatedBy(null);
			setDirty(false);
			toast({
				tone: "success",
				message: "Konten disimpan dan langsung tayang di undangan.",
			});
		} catch {
			const message = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
			setErrorText(message);
			toast({ message });
		} finally {
			setSaving(false);
		}
	}

	async function handleReset() {
		const confirmed = window.confirm(
			"Kembalikan semua konten ke default? Perubahan yang belum disimpan akan hilang.",
		);
		if (!confirmed) return;

		setSaving(true);
		setErrorText(null);

		try {
			const result = await resetInvitationContent({
				data: { baseUpdatedAt },
			});

			if (!result.ok) {
				setErrorText(result.error);
				toast({ message: result.error });
				return;
			}

			setContent(structuredClone(defaultContent));
			setBaseUpdatedAt(result.updatedAt);
			setUpdatedBy(null);
			setDirty(false);
			toast({ tone: "success", message: "Konten dikembalikan ke default." });
		} catch {
			const message = "Gagal mereset konten.";
			setErrorText(message);
			toast({ message });
		} finally {
			setSaving(false);
		}
	}

	const canSave = dirty && !saving;
	const status = dirty
		? "Belum disimpan"
		: baseUpdatedAt
			? "Tersimpan"
			: "Memakai default";

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="font-display text-[26px] leading-tight">
							Konten Undangan
						</h1>
						<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
							{status}
							{baseUpdatedAt ? ` · ${formatSavedAt(baseUpdatedAt)}` : ""}
							{updatedBy ? ` · oleh ${updatedBy}` : ""}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => void handleReset()}
							disabled={saving}
							className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Reset ke default
						</button>
						<button
							type="button"
							onClick={() => void handleSave()}
							disabled={!canSave}
							className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							{saving ? "Menyimpan…" : "Simpan & tayangkan"}
						</button>
					</div>
				</div>

				{missingTable ? (
					<p className="mt-3 rounded-2xl border border-inv-accent/30 bg-inv-bg px-3 py-2 font-body text-[10.5px] leading-[1.6] text-inv-accent">
						Tabel konten belum ada. Jalankan
						supabase/migrations/0005_invitation_content.sql di SQL Editor
						sebelum menyimpan.
					</p>
				) : null}
				{invalidStored ? (
					<p className="mt-3 rounded-2xl border border-inv-accent/30 bg-inv-bg px-3 py-2 font-body text-[10.5px] leading-[1.6] text-inv-accent">
						Konten tersimpan tidak lolos validasi; pratinjau memakai default.
						Simpan ulang untuk memperbaikinya.
					</p>
				) : null}
				{errorText ? (
					<p
						role="alert"
						className="mt-3 rounded-2xl border border-inv-accent/40 bg-inv-bg px-3 py-2 font-body text-[10.5px] leading-[1.6] text-inv-accent"
					>
						{errorText}
					</p>
				) : null}
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
				<ContentEditor value={content} onChange={updateContent} />

				<aside className="lg:sticky lg:top-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
							PRATINJAU LANGSUNG
						</p>
						<fieldset className="m-0 flex gap-1 border-0 p-0">
							<legend className="sr-only">Pilih sisi tamu</legend>
							{SIDE_OPTIONS.map((option) => (
								<button
									key={option.label}
									type="button"
									onClick={() => setSide(option.value)}
									aria-pressed={side === option.value}
									className={`rounded-full border px-2.5 py-1 font-body text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent ${
										side === option.value
											? "border-inv-accent bg-inv-accent text-inv-bg"
											: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
									}`}
								>
									{option.label}
								</button>
							))}
						</fieldset>
					</div>

					<div className="mt-2 overflow-hidden rounded-[28px] border border-inv-rule bg-white shadow-[0_18px_40px_-32px_rgba(52,54,46,0.55)]">
						<iframe
							ref={iframeRef}
							src="/undangan-preview"
							title="Pratinjau undangan"
							className="block h-[min(76vh,720px)] w-full border-0"
						/>
					</div>
					<p className="mt-2 font-body text-[10px] leading-[1.6] text-inv-muted">
						Pratinjau memakai komponen undangan asli. Musik tidak diputar dan
						nomor rekening tidak ditampilkan.
					</p>
				</aside>
			</div>
		</div>
	);
}

function formatSavedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
