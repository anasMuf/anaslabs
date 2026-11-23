import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { ToastProvider } from "#/components/invitation/ui/Toast";
import { getDashboardUser } from "#/lib/dashboard-auth";

const PUBLIC_PATHS = ["/dashboard/login", "/dashboard/auth"];

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ location }) => {
		// Login and the magic-link callback must stay reachable without a session.
		if (PUBLIC_PATHS.includes(location.pathname)) return { user: null };

		const user = await getDashboardUser();
		if (!user) {
			throw redirect({ to: "/dashboard/login" });
		}

		return { user };
	},
	head: () => ({
		meta: [
			{ title: "Dashboard Undangan" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: DashboardLayout,
});

function DashboardLayout() {
	const { user } = Route.useRouteContext();

	if (!user) {
		return (
			<ToastProvider>
				<main className="min-h-dvh bg-inv-bg font-body text-inv-ink">
					<Outlet />
				</main>
			</ToastProvider>
		);
	}

	return (
		<ToastProvider>
			<main className="min-h-dvh bg-inv-bg font-body text-inv-ink">
				<header className="border-b border-inv-rule/70 bg-inv-card/60">
					<div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
						<Link
							to="/dashboard"
							className="shrink-0 font-display text-[16px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent sm:text-[18px]"
						>
							Dashboard Undangan
						</Link>
						<p className="hidden min-w-0 truncate font-body text-[11px] text-inv-muted sm:block">
							{user.email}
						</p>
					</div>
					<nav
						aria-label="Navigasi dashboard"
						className="no-scrollbar flex w-full gap-4 overflow-x-auto px-4 pb-3 font-body text-[11px] whitespace-nowrap text-inv-muted sm:mx-auto sm:max-w-5xl sm:px-5"
					>
						<Link
							to="/dashboard"
							activeOptions={{ exact: true }}
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Ringkasan
						</Link>
						<Link
							to="/dashboard/konten"
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Konten Undangan
						</Link>
						<Link
							to="/dashboard/fotobooth"
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Fotobooth
						</Link>
						<Link
							to="/dashboard/tamu"
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Daftar Tamu
						</Link>
						<Link
							to="/dashboard/impor"
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Impor Tamu
						</Link>
						<Link
							to="/dashboard/wall"
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Photo Wall
						</Link>
					</nav>
				</header>

				<div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-5">
					<Outlet />
				</div>
			</main>
		</ToastProvider>
	);
}
