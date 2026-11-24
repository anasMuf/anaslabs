// biome-ignore-all lint/suspicious/noArrayIndexKey: photobooth slots are ordered and have no id; the list is read-only.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ContentActionBar from "#/components/dashboard/content/ContentActionBar";
import EditorPreviewTabs, {
	type EditorTab,
} from "#/components/dashboard/content/EditorPreviewTabs";
import FrameEditor from "#/components/dashboard/content/FrameEditor";
import { SectionCard, TextField } from "#/components/dashboard/content/fields";
import PhotoboothPreviewCanvas from "#/components/dashboard/content/PhotoboothPreviewCanvas";
import { useContentDraft } from "#/components/dashboard/content/useContentDraft";
import { getInvitationContentForDashboard } from "#/lib/invitation-content";
import { defaultContent } from "#/lib/invitation-content-default";
import type { InvitationContent } from "#/lib/invitation-content-schema";
import type { PhotoboothGrid } from "#/lib/photobooth/types";

const GRID_OPTIONS: PhotoboothGrid[] = [1, 2, 4];
const SCALE_OPTIONS = [1, 2, 3, 4];

const selectClass =
	"mt-1 w-full rounded-xl border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[12px] text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";

export const Route = createFileRoute("/dashboard/photobooth")({
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
	component: DashboardPhotobooth,
});

function DashboardPhotobooth() {
	const data = Route.useLoaderData();

	if (!data.ok) {
		return (
			<div className="rounded-3xl border border-inv-accent/30 bg-inv-card px-5 py-4">
				<h1 className="font-display text-[20px]">Photobooth</h1>
				<p className="mt-2 font-body text-[12px] leading-[1.7] text-inv-muted">
					{data.error}
				</p>
			</div>
		);
	}

	return (
		<PhotoboothScreen
			initialContent={data.content}
			initialUpdatedAt={data.updatedAt}
			initialUpdatedBy={data.updatedBy}
			missingTable={data.missingTable}
			invalidStored={data.invalidStored}
		/>
	);
}

function PhotoboothScreen({
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
		update,
		save,
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
	const [grid, setGrid] = useState<PhotoboothGrid>(1);
	const [tab, setTab] = useState<EditorTab>("editor");

	function updatePhotobooth(patch: Partial<InvitationContent["photobooth"]>) {
		update({ ...content, photobooth: { ...content.photobooth, ...patch } });
	}

	function updateCard(patch: Partial<InvitationContent["photobooth"]["card"]>) {
		updatePhotobooth({ card: { ...content.photobooth.card, ...patch } });
	}

	function resetCard() {
		const confirmed = window.confirm(
			"Kembalikan kartu photobooth ke default? Perubahan yang belum disimpan akan hilang.",
		);
		if (!confirmed) return;

		update({
			...content,
			photobooth: structuredClone(defaultContent.photobooth),
		});
	}

	const canSave = dirty && !saving;

	return (
		<div className="flex flex-col gap-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<h1 className="font-display text-[26px] leading-tight">Photobooth</h1>
				<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
					Atur teks kartu, skala unduhan, dan bingkai per layout. Pratinjau di
					kanan memakai fungsi gambar yang sama dengan hasil tamu.
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
				<div
					className={`flex flex-col gap-4 ${tab === "preview" ? "hidden lg:flex" : ""}`}
				>
					<SectionCard
						title="Teks kartu"
						description="Tulisan yang tercetak di bagian bawah setiap kartu hasil photobooth."
					>
						<TextField
							label="Eyebrow"
							value={content.photobooth.card.eyebrow}
							onChange={(eyebrow) => updateCard({ eyebrow })}
						/>
						<TextField
							label="Nama"
							value={content.photobooth.card.names}
							onChange={(names) => updateCard({ names })}
						/>
						<TextField
							label="Tanggal"
							value={content.photobooth.card.date}
							onChange={(date) => updateCard({ date })}
						/>
					</SectionCard>

					<SectionCard
						title="Unduhan"
						description="Nama file dan resolusi kartu yang disimpan tamu."
					>
						<TextField
							label="Nama file (tanpa ekstensi)"
							value={content.photobooth.downloadName}
							onChange={(downloadName) => updatePhotobooth({ downloadName })}
						/>
						<label className="block">
							<span className="font-body text-[9.5px] font-semibold tracking-[0.12em] text-inv-muted">
								SKALA
							</span>
							<select
								value={content.photobooth.scale}
								onChange={(event) =>
									updatePhotobooth({ scale: Number(event.target.value) })
								}
								className={selectClass}
							>
								{SCALE_OPTIONS.map((scale) => (
									<option key={scale} value={scale}>
										{scale}x
									</option>
								))}
							</select>
							<span className="mt-1 block font-body text-[10px] leading-[1.5] text-inv-muted">
								3x disarankan. Skala lebih besar menghasilkan file lebih berat.
							</span>
						</label>
					</SectionCard>

					<SectionCard
						title="Layout"
						description="Tamu memilih layout saat memotret; pilihan di sini hanya untuk pratinjau."
					>
						<div className="flex flex-wrap gap-2">
							{GRID_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setGrid(option)}
									aria-pressed={grid === option}
									className={`rounded-full border px-3.5 py-1.5 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent ${
										grid === option
											? "border-inv-accent bg-inv-accent text-inv-bg"
											: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
									}`}
								>
									{option} foto
								</button>
							))}
						</div>

						<FrameEditor
							photobooth={content.photobooth}
							grid={grid}
							onChange={(next) => update({ ...content, photobooth: next })}
						/>
					</SectionCard>
				</div>

				<aside
					className={`${tab === "editor" ? "hidden lg:block" : ""} lg:sticky lg:top-4`}
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
							PRATINJAU KARTU
						</p>
						<div className="flex gap-1">
							{GRID_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setGrid(option)}
									aria-pressed={grid === option}
									className={`rounded-full border px-2.5 py-1 font-body text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent ${
										grid === option
											? "border-inv-accent bg-inv-accent text-inv-bg"
											: "border-inv-rule text-inv-ink hover:bg-inv-ink/5"
									}`}
								>
									{option}
								</button>
							))}
						</div>
					</div>
					<div className="mt-2 rounded-[20px] border border-inv-rule bg-inv-rule/20 p-3">
						<PhotoboothPreviewCanvas
							photobooth={content.photobooth}
							grid={grid}
						/>
					</div>
					<p className="mt-2 font-body text-[10px] leading-[1.6] text-inv-muted">
						Pratinjau memakai foto placeholder dan fungsi gambar yang sama
						dengan hasil unduhan tamu.
					</p>
				</aside>
			</div>

			<ContentActionBar
				status={status}
				savedAt={baseUpdatedAt}
				updatedBy={updatedBy}
				saving={saving}
				canSave={canSave}
				onReset={resetCard}
				onSave={() => void save()}
				resetLabel="Reset kartu"
				label="PHOTOBOOTH"
			/>
		</div>
	);
}
