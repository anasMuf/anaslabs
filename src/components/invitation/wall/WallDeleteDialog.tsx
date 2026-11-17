import { useEffect, useRef, useState } from "react";
import { deleteWallCard, type WallCard } from "#/lib/wall";

interface WallDeleteDialogProps {
	card: WallCard;
	token: string;
	onClose: () => void;
	/** Called after the card is gone so the list can be refreshed. */
	onDeleted: () => void;
}

/** Confirmation step for the admin delete, so a stray tap cannot remove a card. */
export default function WallDeleteDialog({
	card,
	token,
	onClose,
	onDeleted,
}: WallDeleteDialogProps) {
	const cancelRef = useRef<HTMLButtonElement | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		cancelRef.current?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !busy) onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [busy, onClose]);

	async function handleDelete() {
		setBusy(true);
		setError(null);

		try {
			const result = await deleteWallCard({ data: { id: card.id, token } });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			onDeleted();
		} catch {
			setError("Gagal menghapus kartu. Periksa koneksi lalu coba lagi.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				tabIndex={-1}
				aria-label="Batal"
				onClick={() => (busy ? undefined : onClose())}
				className="absolute inset-0 h-full w-full cursor-default bg-inv-ink/70 backdrop-blur-sm"
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-label={`Hapus kartu ${card.guestName}`}
				className="relative z-10 w-full max-w-[320px] rounded-3xl bg-inv-bg p-5 text-center shadow-xl"
			>
				<p className="font-display text-[20px] leading-tight">
					Hapus kartu ini?
				</p>
				<p className="mt-2 font-body text-[11px] leading-[1.7] text-inv-muted">
					Kartu dari <strong className="font-semibold">{card.guestName}</strong>{" "}
					beserta foto dan ucapannya akan dihapus permanen.
				</p>

				<div className="mt-5 flex flex-col gap-2">
					<button
						type="button"
						onClick={() => void handleDelete()}
						disabled={busy}
						className="flex items-center justify-center rounded-full bg-inv-accent px-4 py-3 font-body text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy ? "Menghapus…" : "Hapus"}
					</button>
					<button
						ref={cancelRef}
						type="button"
						onClick={onClose}
						disabled={busy}
						className="flex items-center justify-center rounded-full border border-inv-ink/25 px-4 py-3 font-body text-[12px] transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Batal
					</button>
				</div>

				{error ? (
					<p
						role="alert"
						className="mt-3 font-body text-[11px] leading-relaxed text-inv-accent"
					>
						{error}
					</p>
				) : null}
			</div>
		</div>
	);
}
