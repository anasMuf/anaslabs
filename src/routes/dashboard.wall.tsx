import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import WallDeleteDialog from "#/components/invitation/wall/WallDeleteDialog";
import {
	deleteWallCardAsDashboard,
	listWallCardsPage,
	type WallCard,
} from "#/lib/wall";

const PAGE_SIZE = 24;

export const Route = createFileRoute("/dashboard/wall")({
	loader: async () => {
		try {
			const page = await listWallCardsPage({
				data: { offset: 0, limit: PAGE_SIZE },
			});
			return page;
		} catch (error) {
			return {
				ok: false as const,
				error:
					error instanceof Error ? error.message : "Gagal memuat photo wall.",
			};
		}
	},
	component: DashboardWall,
});

function DashboardWall() {
	const data = Route.useLoaderData();

	if (!data.ok) {
		return (
			<div className="rounded-3xl border border-inv-accent/30 bg-inv-card px-5 py-4">
				<h1 className="font-display text-[20px]">Photo Wall</h1>
				<p className="mt-2 font-body text-[12px] leading-[1.7] text-inv-muted">
					{data.error}
				</p>
			</div>
		);
	}

	return (
		<WallScreen
			initialRows={data.rows}
			initialTotal={data.total}
			initialNextOffset={data.nextOffset}
		/>
	);
}

function WallScreen({
	initialRows,
	initialTotal,
	initialNextOffset,
}: {
	initialRows: WallCard[];
	initialTotal: number;
	initialNextOffset: number | null;
}) {
	const toast = useToast();
	const [rows, setRows] = useState(initialRows);
	const [total, setTotal] = useState(initialTotal);
	const [nextOffset, setNextOffset] = useState(initialNextOffset);
	const [loading, setLoading] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<WallCard | null>(null);

	async function loadMore() {
		if (nextOffset === null || loading) return;

		setLoading(true);
		try {
			const page = await listWallCardsPage({
				data: { offset: nextOffset, limit: PAGE_SIZE },
			});
			if (!page.ok) {
				toast({ message: page.error });
				return;
			}

			setRows((current) => [...current, ...page.rows]);
			setTotal(page.total);
			setNextOffset(page.nextOffset);
		} catch {
			toast({ message: "Gagal memuat kartu berikutnya." });
		} finally {
			setLoading(false);
		}
	}

	function handleDeleted() {
		if (!pendingDelete) return;

		setRows((current) => current.filter((row) => row.id !== pendingDelete.id));
		setTotal((value) => Math.max(0, value - 1));
		setNextOffset((value) => (value === null ? null : Math.max(0, value - 1)));
		setPendingDelete(null);
		toast({ tone: "success", message: "Kartu wall dihapus." });
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<h1 className="font-display text-[26px] leading-tight">Photo Wall</h1>
				<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
					{total} kartu terbit. Menghapus kartu juga menghapus foto dan rekaman
					suaranya dari Storage.
				</p>
			</div>

			{rows.length ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{rows.map((card) => (
						<WallCardAdmin
							key={card.id}
							card={card}
							onDelete={() => setPendingDelete(card)}
						/>
					))}
				</div>
			) : (
				<div className="rounded-3xl border border-dashed border-inv-rule px-6 py-12 text-center">
					<p className="mx-auto max-w-[280px] font-body text-[12px] leading-[1.7] text-inv-muted">
						Belum ada kartu di photo wall. Kartu muncul di sini setelah tamu
						mengirim potret dari photobooth.
					</p>
				</div>
			)}

			{nextOffset !== null ? (
				<button
					type="button"
					onClick={() => void loadMore()}
					disabled={loading}
					className="self-center rounded-full border border-inv-ink/25 px-5 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					{loading ? "Memuat…" : `Muat lagi (${rows.length}/${total})`}
				</button>
			) : null}

			{pendingDelete ? (
				<WallDeleteDialog
					card={pendingDelete}
					deleteCard={(id) => deleteWallCardAsDashboard({ data: { id } })}
					onClose={() => setPendingDelete(null)}
					onDeleted={handleDeleted}
				/>
			) : null}
		</div>
	);
}

function WallCardAdmin({
	card,
	onDelete,
}: {
	card: WallCard;
	onDelete: () => void;
}) {
	const imageUrl = card.thumbUrl || card.photoUrl;

	return (
		<article className="overflow-hidden rounded-2xl border border-inv-rule bg-inv-card">
			<div className="relative">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={`Potret dari ${card.guestName}`}
						width={348}
						height={530}
						loading="lazy"
						decoding="async"
						className="block aspect-[348/530] w-full bg-inv-rule/25 object-cover"
					/>
				) : (
					<div className="aspect-[348/530] bg-inv-rule/25" />
				)}

				<button
					type="button"
					onClick={onDelete}
					aria-label={`Hapus kartu ${card.guestName}`}
					className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-inv-bg/90 text-inv-accent shadow-[0_2px_8px_rgba(52,54,46,0.2)] backdrop-blur transition-colors hover:bg-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						aria-hidden="true"
						focusable="false"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.7"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
					</svg>
				</button>
			</div>

			<div className="px-3 pb-3 pt-2.5">
				<p className="font-body text-[12px] font-semibold leading-snug text-inv-ink">
					{card.guestName}
				</p>
				<p className="mt-0.5 font-body text-[10px] text-inv-muted">
					{formatCardDate(card.createdAt)}
				</p>
				{card.message ? (
					<p className="mt-1.5 line-clamp-4 font-body text-[11px] leading-[1.65] text-inv-muted">
						{card.message}
					</p>
				) : null}
				{card.audioUrl ? (
					// biome-ignore lint/a11y/useMediaCaption: voice note from a guest, no transcript exists.
					<audio
						controls
						preload="none"
						src={card.audioUrl}
						className="mt-2 h-9 w-full"
					/>
				) : null}
			</div>
		</article>
	);
}

function formatCardDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";

	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
