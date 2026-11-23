import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ContentActionBar from "#/components/dashboard/content/ContentActionBar";
import ContentEditor from "#/components/dashboard/content/ContentEditor";
import EditorPreviewTabs, {
	type EditorTab,
} from "#/components/dashboard/content/EditorPreviewTabs";
import { useContentDraft } from "#/components/dashboard/content/useContentDraft";
import { getInvitationContentForDashboard } from "#/lib/invitation-content";
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
	const {
		content,
		update: updateContent,
		save,
		resetAll,
		dirty,
		saving,
		errorText,
		baseUpdatedAt,
		updatedBy,
		status,
	} = useContentDraft({
		content: initialContent,
		updatedAt: initialUpdatedAt,
		updatedBy: initialUpdatedBy,
		invalidStored,
	});
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const [side, setSide] = useState<GuestSide | null>("groom");
	const [previewReady, setPreviewReady] = useState(false);
	const [tab, setTab] = useState<EditorTab>("editor");

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

	async function handleReset() {
		const confirmed = window.confirm(
			"Kembalikan semua konten ke default? Perubahan yang belum disimpan akan hilang.",
		);
		if (!confirmed) return;
		await resetAll();
	}

	const canSave = dirty && !saving;

	return (
		<div className="flex flex-col gap-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<h1 className="font-display text-[26px] leading-tight">
					Konten Undangan
				</h1>
				<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
					Ubah teks, jadwal, dan cerita undangan. Pratinjau di kanan
					menyesuaikan saat Anda mengetik.
				</p>

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

			<EditorPreviewTabs value={tab} onChange={setTab} />

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
				<div className={tab === "preview" ? "hidden lg:block" : undefined}>
					<ContentEditor value={content} onChange={updateContent} />
				</div>

				<aside
					className={`${tab === "editor" ? "hidden lg:block" : ""} lg:sticky lg:top-4`}
				>
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

			<ContentActionBar
				status={status}
				savedAt={baseUpdatedAt}
				updatedBy={updatedBy}
				saving={saving}
				canSave={canSave}
				onReset={() => void handleReset()}
				onSave={() => void save()}
				resetLabel="Reset ke default"
			/>
		</div>
	);
}
