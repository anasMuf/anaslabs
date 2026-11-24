import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy alias: the page and its route are now `/dashboard/photobooth`.
 * Kept so old bookmarks and shared links keep working.
 */
export const Route = createFileRoute("/dashboard/fotobooth")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/photobooth", replace: true });
	},
});
