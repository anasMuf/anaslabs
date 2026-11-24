import { useEffect, useId, useRef, useState } from "react";

export interface SearchableOption {
	value: string;
	label: string;
	hint?: string;
}

interface SearchableSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: SearchableOption[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	/** Input teks bebas dengan saran (untuk grup/DIUNDANG). */
	allowCustom?: boolean;
	id?: string;
	ariaLabel?: string;
	className?: string;
	/** Dipanggil saat daftar di-scroll mendekati bawah. */
	onLoadMore?: () => void;
	/** Dipanggil (debounce) saat kata kunci berubah; parent memuat ulang opsi. */
	onSearch?: (term: string) => void;
	hasMore?: boolean;
	loading?: boolean;
}

/**
 * Dropdown dashboard dengan pencarian, keyboard navigation, dan lazy load.
 *
 * `allowCustom` mengubah trigger menjadi input teks (untuk kolom yang boleh
 * berisi nilai bebas seperti grup tamu), sementara mode default memakai tombol
 * + kotak pencarian di dalam popover.
 */
export function SearchableSelect({
	value,
	onChange,
	options,
	placeholder = "Pilih…",
	searchPlaceholder = "Cari…",
	emptyText = "Tidak ada pilihan.",
	disabled = false,
	allowCustom = false,
	id,
	ariaLabel,
	className = "",
	onLoadMore,
	onSearch,
	hasMore = false,
	loading = false,
}: SearchableSelectProps) {
	const autoId = useId();
	const triggerId = id ?? `searchable-${autoId}`;
	const listId = `${triggerId}-listbox`;
	const [open, setOpen] = useState(false);
	const [term, setTerm] = useState("");
	const [active, setActive] = useState(0);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const searchRef = useRef<HTMLInputElement | null>(null);
	const loadMoreRef = useRef(onLoadMore);
	const searchRefCb = useRef(onSearch);
	loadMoreRef.current = onLoadMore;
	searchRefCb.current = onSearch;

	const needle = (allowCustom ? value : term).trim().toLowerCase();
	const filtered = needle
		? options.filter(
				(option) =>
					option.label.toLowerCase().includes(needle) ||
					option.value.toLowerCase().includes(needle),
			)
		: options;
	const selected = options.find((option) => option.value === value);
	const showSearch =
		!allowCustom &&
		(options.length > 6 || Boolean(onSearch) || Boolean(onLoadMore));

	useEffect(() => {
		if (!open) return;
		const onDocumentClick = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDocumentClick);
		return () => document.removeEventListener("mousedown", onDocumentClick);
	}, [open]);

	useEffect(() => {
		if (open && showSearch) searchRef.current?.focus();
	}, [open, showSearch]);

	useEffect(() => {
		if (!open) return;
		const timer = setTimeout(() => searchRefCb.current?.(needle), 300);
		return () => clearTimeout(timer);
	}, [open, needle]);

	function choose(option: SearchableOption) {
		onChange(option.value);
		setOpen(false);
		setTerm("");
	}

	function handleKeyDown(event: React.KeyboardEvent) {
		if (disabled) return;

		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (!open) {
				setOpen(true);
				return;
			}
			setActive((current) => Math.min(current + 1, filtered.length - 1));
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive((current) => Math.max(current - 1, 0));
			return;
		}
		if (event.key === "Enter") {
			if (open && filtered[active]) {
				event.preventDefault();
				choose(filtered[active]);
			}
			return;
		}
		if (event.key === "Escape") {
			setOpen(false);
		}
	}

	const triggerClass =
		"flex w-full items-center justify-between gap-2 rounded-2xl border border-inv-rule bg-inv-bg px-3 py-2 text-left font-body text-[11px] text-inv-ink transition-colors placeholder:text-inv-muted/60 hover:bg-inv-ink/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:cursor-not-allowed disabled:opacity-50";

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			{allowCustom ? (
				<input
					id={triggerId}
					type="text"
					value={value}
					disabled={disabled}
					placeholder={placeholder}
					aria-label={ariaLabel}
					role="combobox"
					aria-expanded={open}
					aria-controls={listId}
					autoComplete="off"
					onChange={(event) => {
						onChange(event.target.value);
						setActive(0);
						setOpen(true);
					}}
					onFocus={() => {
						setActive(0);
						setOpen(true);
					}}
					onKeyDown={handleKeyDown}
					className={triggerClass}
				/>
			) : (
				<button
					id={triggerId}
					type="button"
					disabled={disabled}
					aria-label={ariaLabel}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={listId}
					onClick={() => {
						setActive(0);
						setOpen((current) => !current);
					}}
					onKeyDown={handleKeyDown}
					className={triggerClass}
				>
					<span className="truncate">{selected?.label || placeholder}</span>
					<span aria-hidden="true" className="shrink-0 text-inv-muted">
						{open ? "▴" : "▾"}
					</span>
				</button>
			)}

			{open ? (
				<div className="absolute inset-x-0 z-40 mt-1 rounded-2xl border border-inv-rule bg-inv-card p-1 shadow-[0_18px_40px_-24px_rgba(52,54,46,0.6)]">
					{showSearch ? (
						<input
							ref={searchRef}
							value={term}
							onChange={(event) => {
								setTerm(event.target.value);
								setActive(0);
							}}
							onKeyDown={handleKeyDown}
							placeholder={searchPlaceholder}
							aria-label={searchPlaceholder}
							aria-controls={listId}
							className="mb-1 w-full rounded-xl border border-inv-rule bg-inv-bg px-2.5 py-1.5 font-body text-[11px] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						/>
					) : null}

					<div
						id={listId}
						role="listbox"
						aria-label={ariaLabel}
						onScroll={(event) => {
							const element = event.currentTarget;
							if (
								hasMore &&
								!loading &&
								element.scrollTop + element.clientHeight >=
									element.scrollHeight - 24
							) {
								loadMoreRef.current?.();
							}
						}}
						className="max-h-56 overflow-y-auto overscroll-contain"
					>
						{filtered.map((option, index) => (
							<button
								key={option.value || "__empty"}
								type="button"
								role="option"
								aria-selected={option.value === value}
								onMouseDown={(event) => event.preventDefault()}
								onMouseEnter={() => setActive(index)}
								onClick={() => choose(option)}
								className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-2.5 py-1.5 text-left font-body text-[11px] transition-colors ${
									index === active
										? "bg-inv-ink/5 text-inv-ink"
										: "text-inv-ink hover:bg-inv-ink/5"
								} ${option.value === value ? "font-semibold" : ""}`}
							>
								<span className="min-w-0 truncate">{option.label}</span>
								{option.hint ? (
									<span className="shrink-0 text-[9.5px] text-inv-muted">
										{option.hint}
									</span>
								) : null}
							</button>
						))}

						{loading ? (
							<p className="px-2.5 py-2 font-body text-[10px] text-inv-muted">
								Memuat…
							</p>
						) : null}

						{hasMore && !loading ? (
							<button
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => loadMoreRef.current?.()}
								className="mt-1 w-full rounded-xl border border-inv-rule px-2.5 py-1.5 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Muat lagi
							</button>
						) : null}

						{!filtered.length && !loading ? (
							<p className="px-2.5 py-2 font-body text-[10.5px] text-inv-muted">
								{emptyText}
							</p>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
