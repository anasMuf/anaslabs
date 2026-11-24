import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/blast/")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/blast/setup" });
	},
});
