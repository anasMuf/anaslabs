import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/blast")({
	head: () => ({
		meta: [{ title: "Blast WhatsApp — Dashboard Undangan" }],
	}),
	component: BlastLayout,
});

function BlastLayout() {
	return (
		<div className="flex flex-col gap-5">
			<div>
				<h1 className="font-display text-[26px] leading-tight">
					Blast WhatsApp
				</h1>
				<p className="mt-1 font-body text-[12px] leading-[1.7] text-inv-muted">
					Kelola dua nomor Wablas, susun pesan, lalu kirim undangan ke tamu
					digital satu per satu atau massal.
				</p>
			</div>

			<nav
				aria-label="Navigasi blast"
				className="no-scrollbar flex gap-2 overflow-x-auto font-body text-[11px] whitespace-nowrap"
			>
				<Link
					to="/dashboard/blast/setup"
					className="rounded-full border border-inv-rule px-3.5 py-1.5 text-inv-muted transition-colors hover:bg-inv-ink/5 data-[status=active]:border-inv-accent data-[status=active]:bg-inv-accent data-[status=active]:font-semibold data-[status=active]:text-inv-bg"
				>
					Setup nomor
				</Link>
				<Link
					to="/dashboard/blast/og"
					className="rounded-full border border-inv-rule px-3.5 py-1.5 text-inv-muted transition-colors hover:bg-inv-ink/5 data-[status=active]:border-inv-accent data-[status=active]:bg-inv-accent data-[status=active]:font-semibold data-[status=active]:text-inv-bg"
				>
					Open Graph
				</Link>
				<Link
					to="/dashboard/blast/template"
					className="rounded-full border border-inv-rule px-3.5 py-1.5 text-inv-muted transition-colors hover:bg-inv-ink/5 data-[status=active]:border-inv-accent data-[status=active]:bg-inv-accent data-[status=active]:font-semibold data-[status=active]:text-inv-bg"
				>
					Template
				</Link>
				<Link
					to="/dashboard/blast/kirim"
					className="rounded-full border border-inv-rule px-3.5 py-1.5 text-inv-muted transition-colors hover:bg-inv-ink/5 data-[status=active]:border-inv-accent data-[status=active]:bg-inv-accent data-[status=active]:font-semibold data-[status=active]:text-inv-bg"
				>
					Kirim
				</Link>
				<Link
					to="/dashboard/blast/tracking"
					className="rounded-full border border-inv-rule px-3.5 py-1.5 text-inv-muted transition-colors hover:bg-inv-ink/5 data-[status=active]:border-inv-accent data-[status=active]:bg-inv-accent data-[status=active]:font-semibold data-[status=active]:text-inv-bg"
				>
					Tracking
				</Link>
			</nav>

			<Outlet />
		</div>
	);
}
