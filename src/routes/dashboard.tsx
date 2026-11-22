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
					<div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-3">
						<Link
							to="/dashboard"
							className="font-display text-[18px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Dashboard Undangan
						</Link>
						<p className="truncate font-body text-[11px] text-inv-muted">
							{user.email}
						</p>
					</div>
					<nav
						aria-label="Navigasi dashboard"
						className="mx-auto flex w-full max-w-5xl gap-4 px-5 pb-3 font-body text-[11px] text-inv-muted"
					>
						<Link
							to="/dashboard"
							activeOptions={{ exact: true }}
							className="transition-colors hover:text-inv-ink data-[status=active]:font-semibold data-[status=active]:text-inv-ink"
						>
							Ringkasan
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
					</nav>
				</header>

				<div className="mx-auto w-full max-w-5xl px-5 py-6">
					<Outlet />
				</div>
			</main>
		</ToastProvider>
	);
}
