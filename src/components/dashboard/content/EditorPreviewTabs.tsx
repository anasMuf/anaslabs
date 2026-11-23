export type EditorTab = "editor" | "preview";

/** Segmented control shown only below `lg`; both panes stay mounted. */
export default function EditorPreviewTabs({
	value,
	onChange,
}: {
	value: EditorTab;
	onChange: (tab: EditorTab) => void;
}) {
	const tabClass = (active: boolean) =>
		`rounded-full px-4 py-2 font-body text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent ${
			active
				? "bg-inv-accent font-semibold text-inv-bg"
				: "text-inv-muted hover:bg-inv-ink/5 hover:text-inv-ink"
		}`;

	return (
		<div
			role="tablist"
			aria-label="Pilih tampilan editor atau pratinjau"
			className="grid grid-cols-2 gap-1 rounded-full border border-inv-rule bg-inv-card p-1 lg:hidden"
		>
			<button
				type="button"
				role="tab"
				aria-selected={value === "editor"}
				onClick={() => onChange("editor")}
				className={tabClass(value === "editor")}
			>
				Editor
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={value === "preview"}
				onClick={() => onChange("preview")}
				className={tabClass(value === "preview")}
			>
				Pratinjau
			</button>
		</div>
	);
}
