interface ContentActionBarProps {
	status: string;
	savedAt: string | null;
	updatedBy: string | null;
	saving: boolean;
	canSave: boolean;
	onReset: () => void;
	onSave: () => void;
	resetLabel: string;
	label?: string;
}

function formatSavedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

/**
 * Fixed save/reset bar shared by the content and photobooth editors.
 *
 * It stays above the safe area on phones and is always reachable while
 * scrolling through long forms.
 */
export default function ContentActionBar({
	status,
	savedAt,
	updatedBy,
	saving,
	canSave,
	onReset,
	onSave,
	resetLabel,
	label = "KONTEN",
}: ContentActionBarProps) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t border-inv-rule bg-inv-bg/95 backdrop-blur">
			<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-5">
				<div className="min-w-0 flex-1">
					<p className="font-body text-[9.5px] font-semibold tracking-[0.16em] text-inv-accent">
						{label}
					</p>
					<p
						aria-live="polite"
						className="truncate font-body text-[10.5px] text-inv-muted"
					>
						{status}
						{savedAt ? ` · ${formatSavedAt(savedAt)}` : ""}
						{updatedBy ? ` · oleh ${updatedBy}` : ""}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={onReset}
						disabled={saving}
						className="rounded-full border border-inv-ink/25 px-3.5 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent sm:px-4"
					>
						{resetLabel}
					</button>
					<button
						type="button"
						onClick={onSave}
						disabled={!canSave}
						className="rounded-full bg-inv-accent px-3.5 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent sm:px-4"
					>
						{saving ? "Menyimpan…" : "Simpan & tayangkan"}
					</button>
				</div>
			</div>
		</div>
	);
}
