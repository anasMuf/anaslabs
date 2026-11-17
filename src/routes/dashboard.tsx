import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
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
			<main className="min-h-dvh bg-inv-bg font-body text-inv-ink">
				<Outlet />
			</main>
		);
	}

	return (
		<main className="min-h-dvh bg-inv-bg font-body text-inv-ink">
			<header className="border-b border-inv-rule/70 bg-inv-card/60">
				<div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
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
			</header>

			<div className="mx-auto w-full max-w-3xl px-5 py-6">
				<Outlet />
			</div>
		</main>
	);
}
