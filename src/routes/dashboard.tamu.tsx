import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import GuestEditDialog from "#/components/dashboard/GuestEditDialog";
import CopyButton from "#/components/invitation/ui/CopyButton";
import { useToast } from "#/components/invitation/ui/Toast";
import { GUEST_PAGE_SIZE, GUEST_SOURCE_LABELS } from "#/lib/guest-import";
import {
	type DashboardGuest,
	EMPTY_GUEST_FILTERS,
	type GuestFilterOptions,
	type GuestFilters,
	type GuestStats,
	getGuestFilterOptions,
	getGuestStats,
	listGuestsPage,
	setGuestSent,
} from "#/lib/guests";
import { SITE_URL } from "#/lib/site";

const EMPTY_STATS: GuestStats = {
	total: 0,
	digital: 0,
	fisik: 0,
	sent: 0,
	opened: 0,
	archived: 0,
};

const EMPTY_OPTIONS: GuestFilterOptions = {
	all: { groups: [], addresses: [] },
	anas: { groups: [], addresses: [] },
	mila: { groups: [], addresses: [] },
};

const selectClass =
	"w-full rounded-xl border border-inv-rule bg-inv-bg px-2.5 py-2 font-body text-[11px] text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

function FilterField({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<label
				htmlFor={htmlFor}
				className="font-body text-[9.5px] font-semibold tracking-[0.12em] text-inv-muted"
			>
				{label}
			</label>
			<div className="mt-1">{children}</div>
		</div>
	);
}

export const Route = createFileRoute("/dashboard/tamu")({
	loader: async () => {
		// A missing migration must not blow up the page: show it as a notice so the
		// fix (run 0003 + 0004) is right in front of the user.
		try {
			const [initial, stats, options] = await Promise.all([
				listGuestsPage({ data: { offset: 0, limit: GUEST_PAGE_SIZE } }),
				getGuestStats(),
				getGuestFilterOptions(),
			]);
			return { initial, stats, options, error: null as string | null };
		} catch (error) {
			return {
				initial: { rows: [] as DashboardGuest[], total: 0 },
				stats: EMPTY_STATS,
				options: EMPTY_OPTIONS,
				error:
					error instanceof Error ? error.message : "Gagal memuat daftar tamu.",
			};
		}
	},
	component: DashboardGuests,
});

function invitationUrl(slug: string) {
	return `${SITE_URL}/invitation/${slug}`;
}

function DashboardGuests() {
	const toast = useToast();
	const {
		initial,
		stats: initialStats,
		options,
		error,
	} = Route.useLoaderData();

	const [rows, setRows] = useState<DashboardGuest[]>(initial.rows);
	const [total, setTotal] = useState(initial.total);
	const [stats, setStats] = useState<GuestStats>(initialStats);
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState<GuestFilters>(EMPTY_GUEST_FILTERS);
	const [loading, setLoading] = useState(false);
	const [failure, setFailure] = useState<string | null>(error);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [editing, setEditing] = useState<DashboardGuest | null>(null);
	const [filtersOpen, setFiltersOpen] = useState(false);

	const filtersActive = Object.values(filters).some(Boolean);
	const activeFilterCount = Object.values(filters).filter(Boolean).length;
	const activeOptions = options[filters.source || "all"];

	// Refs mirror state for the IntersectionObserver callback, which must not be
	// re-created on every render.
	const rowsRef = useRef(rows);
	rowsRef.current = rows;
	const totalRef = useRef(total);
	totalRef.current = total;
	const queryRef = useRef(query);
	queryRef.current = query;
	const filtersRef = useRef(filters);
	filtersRef.current = filters;
	const loadingRef = useRef(false);
	const requestRef = useRef(0);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const fetchPage = useCallback(
		async (
			offset: number,
			term: string,
			activeFilters: GuestFilters,
			append: boolean,
		) => {
			loadingRef.current = true;
			setLoading(true);
			const requestId = requestRef.current + 1;
			requestRef.current = requestId;

			try {
				const page = await listGuestsPage({
					data: {
						offset,
						limit: GUEST_PAGE_SIZE,
						query: term,
						...activeFilters,
					},
				});
				if (requestId !== requestRef.current) return;
				setRows((current) => (append ? [...current, ...page.rows] : page.rows));
				setTotal(page.total);
				setFailure(null);
			} catch (caught) {
				if (requestId !== requestRef.current) return;
				setFailure(
					caught instanceof Error ? caught.message : "Gagal memuat tamu.",
				);
			} finally {
				if (requestId === requestRef.current) {
					loadingRef.current = false;
					setLoading(false);
				}
			}
		},
		[],
	);

	// Debounce the search field, then reload from the first page.
	useEffect(() => {
		const timer = setTimeout(() => setQuery(search.trim()), 300);
		return () => clearTimeout(timer);
	}, [search]);

	const firstQuery = useRef(true);
	useEffect(() => {
		if (firstQuery.current) {
			firstQuery.current = false;
			return;
		}
		void fetchPage(0, query, filters, false);
	}, [query, filters, fetchPage]);

	const hasMore = rows.length < total;
	const remaining = total - rows.length;

	const loadMore = useCallback(() => {
		if (loadingRef.current) return;
		if (rowsRef.current.length >= totalRef.current) return;
		void fetchPage(
			rowsRef.current.length,
			queryRef.current,
			filtersRef.current,
			true,
		);
	}, [fetchPage]);

	useEffect(() => {
		const node = sentinelRef.current;
		if (!node || typeof IntersectionObserver === "undefined") return;
		// `remaining` is read so the observer is re-created after each page: the
		// sentinel may still sit inside the viewport when the table is short.
		if (remaining <= 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) loadMore();
			},
			{ rootMargin: "400px 0px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [loadMore, remaining]);

	async function toggleSent(guest: DashboardGuest) {
		const next = !guest.sent;
		setSavingId(guest.id);
		try {
			const result = await setGuestSent({
				data: { id: guest.id, sent: next },
			});
			if (!result.ok) {
				toast({ message: result.error ?? "Gagal menyimpan status." });
				return;
			}
			setRows((current) =>
				current.map((row) =>
					row.id === guest.id ? { ...row, sent: next } : row,
				),
			);
			setStats((current) => ({
				...current,
				sent: Math.max(0, current.sent + (next ? 1 : -1)),
			}));
		} catch {
			toast({ message: "Gagal menyimpan status. Coba lagi." });
		} finally {
			setSavingId(null);
		}
	}

	function handleSaved(updated: DashboardGuest) {
		const before = rows.find((row) => row.id === updated.id);
		setRows((current) =>
			current.map((row) => (row.id === updated.id ? updated : row)),
		);

		if (!before || before.delivery === updated.delivery) return;
		const becameDigital = updated.delivery === "digital";
		setStats((current) => ({
			...current,
			digital: Math.max(0, current.digital + (becameDigital ? 1 : -1)),
			fisik: Math.max(0, current.fisik + (becameDigital ? -1 : 1)),
		}));
	}

	function handleArchived(guest: DashboardGuest) {
		setRows((current) => current.filter((row) => row.id !== guest.id));
		setTotal((current) => Math.max(0, current - 1));
		setStats((current) => ({
			...current,
			total: Math.max(0, current.total - 1),
			archived: current.archived + 1,
			digital: Math.max(
				0,
				current.digital - (guest.delivery === "digital" ? 1 : 0),
			),
			fisik: Math.max(0, current.fisik - (guest.delivery === "fisik" ? 1 : 0)),
			sent: Math.max(0, current.sent - (guest.sent ? 1 : 0)),
			opened: Math.max(
				0,
				current.opened -
					(guest.delivery === "digital" && guest.openedAt ? 1 : 0),
			),
		}));
	}

	function setFilter<K extends keyof GuestFilters>(
		key: K,
		value: GuestFilters[K],
	) {
		setFilters((current) => ({ ...current, [key]: value }));
	}

	function resetFilters() {
		setFilters(EMPTY_GUEST_FILTERS);
		setSearch("");
	}

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h1 className="font-display text-[26px] leading-tight">Daftar Tamu</h1>
				<p className="mt-1 font-body text-[12px] leading-[1.7] text-inv-muted">
					{stats.total} tamu aktif · {stats.digital} digital · {stats.fisik}{" "}
					fisik · {stats.sent} terkirim · {stats.opened} digital sudah membuka
					{stats.archived > 0 ? ` · ${stats.archived} diarsipkan` : ""}
				</p>
			</div>

			{failure ? (
				<p className="rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 font-body text-[11px] leading-relaxed text-inv-accent">
					{failure}
				</p>
			) : null}

			<div className="rounded-2xl border border-inv-rule bg-inv-card px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						FILTER
					</p>
					<div className="flex items-center gap-3">
						{filtersActive || search ? (
							<button
								type="button"
								onClick={resetFilters}
								className="font-body text-[10.5px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Reset
							</button>
						) : null}
						<button
							type="button"
							onClick={() => setFiltersOpen((open) => !open)}
							aria-expanded={filtersOpen}
							aria-controls="guest-filters"
							className="rounded-full border border-inv-rule px-3 py-1 font-body text-[10.5px] text-inv-ink transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent lg:hidden"
						>
							{filtersOpen
								? "Sembunyikan"
								: activeFilterCount > 0
									? `Tampilkan (${activeFilterCount})`
									: "Tampilkan"}
						</button>
					</div>
				</div>

				<div
					id="guest-filters"
					className={`mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 ${
						filtersOpen ? "" : "hidden lg:grid"
					}`}
				>
					<FilterField label="TAMU" htmlFor="filter-source">
						<select
							id="filter-source"
							value={filters.source}
							onChange={(event) => {
								const source =
									event.target.value === "anas" || event.target.value === "mila"
										? event.target.value
										: "";
								const nextOptions = options[source || "all"];
								setFilters((current) => ({
									...current,
									source,
									// Grup dan alamat hanya boleh berisi nilai milik sheet ini.
									group: nextOptions.groups.includes(current.group)
										? current.group
										: "",
									address: nextOptions.addresses.includes(current.address)
										? current.address
										: "",
								}));
							}}
							className={selectClass}
						>
							<option value="">Semua sheet</option>
							<option value="anas">Anas</option>
							<option value="mila">Mila</option>
						</select>
					</FilterField>

					<FilterField label="GRUP" htmlFor="filter-group">
						<select
							id="filter-group"
							value={filters.group}
							onChange={(event) => setFilter("group", event.target.value)}
							className={selectClass}
						>
							<option value="">Semua grup</option>
							{activeOptions.groups.map((group) => (
								<option key={group} value={group}>
									{group}
								</option>
							))}
						</select>
					</FilterField>

					<FilterField label="ALAMAT" htmlFor="filter-address">
						<select
							id="filter-address"
							value={filters.address}
							disabled={activeOptions.addresses.length === 0}
							onChange={(event) => setFilter("address", event.target.value)}
							className={selectClass}
						>
							<option value="">Semua alamat</option>
							{activeOptions.addresses.map((address) => (
								<option key={address} value={address}>
									{address}
								</option>
							))}
						</select>
					</FilterField>

					<FilterField label="TIPE" htmlFor="filter-delivery">
						<select
							id="filter-delivery"
							value={filters.delivery}
							onChange={(event) => {
								const value = event.target.value;
								const delivery =
									value === "digital" || value === "fisik" ? value : "";
								setFilters((current) => ({
									...current,
									delivery,
									opened: delivery === "fisik" ? "" : current.opened,
								}));
							}}
							className={selectClass}
						>
							<option value="">Semua tipe</option>
							<option value="digital">Digital</option>
							<option value="fisik">Fisik</option>
						</select>
					</FilterField>

					<FilterField label="PENGIRIMAN" htmlFor="filter-sent">
						<select
							id="filter-sent"
							value={filters.sent}
							onChange={(event) => {
								const value = event.target.value;
								setFilter(
									"sent",
									value === "sent" || value === "unsent" ? value : "",
								);
							}}
							className={selectClass}
						>
							<option value="">Semua status</option>
							<option value="sent">Sudah dikirim</option>
							<option value="unsent">Belum dikirim</option>
						</select>
					</FilterField>

					<FilterField label="BUKA UNDANGAN" htmlFor="filter-opened">
						<select
							id="filter-opened"
							value={filters.opened}
							disabled={filters.delivery === "fisik"}
							onChange={(event) => {
								const value = event.target.value;
								setFilter(
									"opened",
									value === "opened" || value === "unopened" ? value : "",
								);
							}}
							className={selectClass}
						>
							<option value="">Semua</option>
							<option value="opened">Sudah buka</option>
							<option value="unopened">Belum buka</option>
						</select>
					</FilterField>
				</div>

				{filters.delivery === "fisik" ? (
					<p className="mt-2 font-body text-[10px] leading-relaxed text-inv-muted">
						Undangan fisik tidak punya status buka, jadi filter ini
						dinonaktifkan.
					</p>
				) : null}

				{filters.source && activeOptions.addresses.length === 0 ? (
					<p className="mt-2 font-body text-[10px] leading-relaxed text-inv-muted">
						Sheet {GUEST_SOURCE_LABELS[filters.source]} belum punya data alamat.
					</p>
				) : null}
			</div>

			<div>
				<label
					htmlFor="guest-search"
					className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent"
				>
					CARI TAMU
				</label>
				<input
					id="guest-search"
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Nama, grup, alamat, atau slug"
					className="mt-2 w-full rounded-2xl border border-inv-rule bg-inv-card px-4 py-2.5 font-body text-[12px] text-inv-ink placeholder:text-inv-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				/>
				<p className="mt-2 font-body text-[10.5px] text-inv-muted">
					{loading ? "Memuat…" : `${rows.length} dari ${total} tamu cocok`}
					<span className="sm:hidden"> · geser tabel untuk kolom lain</span>
				</p>
			</div>

			{rows.length === 0 && !loading ? (
				<p className="rounded-2xl border border-inv-rule bg-inv-card px-4 py-6 text-center font-body text-[12px] text-inv-muted">
					{query || filtersActive
						? "Tidak ada tamu yang cocok dengan pencarian atau filter."
						: "Belum ada tamu. Impor dari sheet lewat menu Impor Tamu."}
				</p>
			) : (
				<div className="overflow-x-auto rounded-2xl border border-inv-rule bg-inv-card">
					<table className="w-full min-w-[820px] border-collapse">
						<caption className="sr-only">
							Daftar tamu undangan, diurutkan per sheet lalu nama.
						</caption>
						<thead className="sticky top-0 z-10 bg-inv-card">
							<tr className="border-b border-inv-rule text-left font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-inv-muted">
								<th
									scope="col"
									className="sticky left-0 z-20 border-r border-inv-rule bg-inv-card px-4 py-2.5"
								>
									Nama
								</th>
								<th scope="col" className="px-4 py-2.5">
									Grup
								</th>
								<th scope="col" className="px-4 py-2.5">
									Alamat
								</th>
								<th scope="col" className="px-4 py-2.5">
									Tipe
								</th>
								<th scope="col" className="px-4 py-2.5">
									Status
								</th>
								<th scope="col" className="px-4 py-2.5 text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="font-body text-[12px] text-inv-ink">
							{rows.map((guest) => (
								<tr
									key={guest.id}
									className="border-b border-inv-rule/60 align-top last:border-0"
								>
									<th
										scope="row"
										className="sticky left-0 z-[1] max-w-[220px] border-r border-inv-rule bg-inv-card px-4 py-3 text-left font-semibold"
									>
										<span className="block truncate">{guest.name}</span>
										<span className="mt-0.5 block font-normal text-[10px] text-inv-muted">
											{GUEST_SOURCE_LABELS[guest.source]}
										</span>
									</th>
									<td className="max-w-[180px] px-4 py-3 text-[11px] text-inv-muted">
										<span className="block truncate">
											{guest.groupName ?? "—"}
										</span>
										{guest.invited ? (
											<span className="mt-0.5 inline-block rounded-full border border-inv-accent/40 px-2 py-0.5 text-[9.5px] text-inv-accent">
												{guest.invited}
											</span>
										) : null}
									</td>
									<td className="max-w-[160px] px-4 py-3 text-[11px] text-inv-muted">
										<span className="block truncate">
											{guest.address ?? "—"}
										</span>
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-[11px] text-inv-muted">
										{guest.delivery === "fisik" ? "Fisik" : "Digital"}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-[10.5px] text-inv-muted">
										<span className="block">
											{guest.sent ? "Terkirim" : "Belum dikirim"}
										</span>
										{guest.delivery === "digital" ? (
											<span className="block">
												{guest.openedAt ? "Sudah buka" : "Belum buka"}
											</span>
										) : (
											<span
												className="block"
												title="Undangan fisik tidak punya status buka"
											>
												—
											</span>
										)}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-2">
											{guest.delivery === "digital" ? (
												<CopyButton
													value={invitationUrl(guest.slug)}
													label="Link"
													copiedLabel="Tersalin"
												/>
											) : null}
											<button
												type="button"
												onClick={() => void toggleSent(guest)}
												disabled={savingId === guest.id}
												className="whitespace-nowrap rounded-full border border-inv-rule px-2.5 py-1 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
											>
												{savingId === guest.id
													? "Menyimpan…"
													: guest.sent
														? "Batalkan"
														: "Tandai"}
											</button>
											<button
												type="button"
												onClick={() => setEditing(guest)}
												className="whitespace-nowrap rounded-full border border-inv-rule px-2.5 py-1 font-body text-[10px] text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
											>
												Ubah
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<div ref={sentinelRef} aria-hidden="true" className="h-1" />

			<div className="flex flex-col items-center gap-2">
				{loading ? (
					<p className="font-body text-[11px] text-inv-muted">Memuat lagi…</p>
				) : hasMore ? (
					<button
						type="button"
						onClick={loadMore}
						className="rounded-full border border-inv-ink/25 px-4 py-2 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Muat lagi
					</button>
				) : rows.length > 0 ? (
					<p className="font-body text-[10.5px] text-inv-muted">
						Semua tamu sudah tampil.
					</p>
				) : null}
			</div>

			{editing ? (
				<GuestEditDialog
					guest={editing}
					groups={options[editing.source].groups}
					onClose={() => setEditing(null)}
					onSaved={handleSaved}
					onArchived={handleArchived}
				/>
			) : null}
		</div>
	);
}
