import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-5">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					TAHAP BERIKUTNYA
				</p>
				<ul className="mt-3 flex flex-col gap-2 font-body text-[12px] leading-[1.7] text-inv-muted">
					<li>· Impor data tamu dari Google Sheets</li>
					<li>· Daftar tamu + status sudah membuka undangan</li>
					<li>· Kelola kartu photo wall dari sini</li>
				</ul>
				<p className="mt-3 font-body text-[11px] leading-relaxed text-inv-muted">
					Blast WhatsApp dan editor konten menyusul setelah tiga hal di atas
					selesai.
				</p>
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
