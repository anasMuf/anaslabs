import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signOutDashboard } from "#/lib/dashboard-auth";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardOverview,
});

function DashboardOverview() {
	const navigate = useNavigate();
	const { user } = Route.useRouteContext();

	if (!user) return null;

	async function handleSignOut() {
		await signOutDashboard();
		await navigate({ to: "/dashboard/login", replace: true });
	}

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h1 className="font-display text-[26px] leading-tight">
					Selamat datang
				</h1>
				<p className="mt-1 font-body text-[12px] leading-[1.7] text-inv-muted">
					Masuk sebagai {user.email}.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<Link
					to="/dashboard/konten"
					className="flex items-start justify-between gap-4 rounded-3xl border border-inv-rule bg-inv-card px-5 py-4 transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<div>
						<p className="font-display text-[18px] leading-tight">
							Konten Undangan
						</p>
						<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
							Ubah teks, acara, cerita, dan musik dengan pratinjau langsung.
						</p>
					</div>
					<span
						aria-hidden="true"
						className="mt-1 font-body text-[14px] text-inv-muted"
					>
						→
					</span>
				</Link>

				<Link
					to="/dashboard/tamu"
					className="flex items-start justify-between gap-4 rounded-3xl border border-inv-rule bg-inv-card px-5 py-4 transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<div>
						<p className="font-display text-[18px] leading-tight">
							Daftar Tamu
						</p>
						<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
							Cari tamu, salin link undangan, tandai terkirim, dan pantau siapa
							yang sudah membuka.
						</p>
					</div>
					<span
						aria-hidden="true"
						className="mt-1 font-body text-[14px] text-inv-muted"
					>
						→
					</span>
				</Link>

				<Link
					to="/dashboard/impor"
					className="flex items-start justify-between gap-4 rounded-3xl border border-inv-rule bg-inv-card px-5 py-4 transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<div>
						<p className="font-display text-[18px] leading-tight">Impor Tamu</p>
						<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
							Tempel salinan dari Google Sheets, lihat pratinjau, lalu terapkan.
						</p>
					</div>
					<span
						aria-hidden="true"
						className="mt-1 font-body text-[14px] text-inv-muted"
					>
						→
					</span>
				</Link>

				<Link
					to="/dashboard/fotobooth"
					className="flex items-start justify-between gap-4 rounded-3xl border border-inv-rule bg-inv-card px-5 py-4 transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<div>
						<p className="font-display text-[18px] leading-tight">Fotobooth</p>
						<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
							Ubah teks kartu, nama file, skala, dan lihat pratinjau semua
							layout.
						</p>
					</div>
					<span
						aria-hidden="true"
						className="mt-1 font-body text-[14px] text-inv-muted"
					>
						→
					</span>
				</Link>

				<Link
					to="/dashboard/wall"
					className="flex items-start justify-between gap-4 rounded-3xl border border-inv-rule bg-inv-card px-5 py-4 transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<div>
						<p className="font-display text-[18px] leading-tight">Photo Wall</p>
						<p className="mt-1 font-body text-[11px] leading-[1.7] text-inv-muted">
							Lihat kartu yang dikirim tamu, putar ucapan suara, dan hapus yang
							tidak diinginkan.
						</p>
					</div>
					<span
						aria-hidden="true"
						className="mt-1 font-body text-[14px] text-inv-muted"
					>
						→
					</span>
				</Link>
			</div>

			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					MENYUSUL
				</p>
				<ul className="mt-2 flex flex-col gap-1.5 font-body text-[11px] leading-[1.7] text-inv-muted">
					<li>· Blast WhatsApp lewat Wablas</li>
					<li>· Editor frame photobooth</li>
				</ul>
			</div>

			<button
				type="button"
				onClick={() => void handleSignOut()}
				className="self-start rounded-full border border-inv-ink/25 px-5 py-3 font-body text-[12px] transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				Keluar
			</button>
		</div>
	);
}
