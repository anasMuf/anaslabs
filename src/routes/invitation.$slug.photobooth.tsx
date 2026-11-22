import { createFileRoute } from "@tanstack/react-router";
import PhotoboothPage from "#/components/invitation/photobooth/PhotoboothPage";
import type { GuestSide } from "#/lib/invitation-personalization";
import { getInvitationView } from "#/lib/invitation-view";

export const Route = createFileRoute("/invitation/$slug/photobooth")({
	head: ({ matches }) => {
		const parent = matches.find(
			(match) => (match.routeId as string) === "/invitation/$slug",
		);
		const side =
			(parent?.loaderData as { side?: GuestSide } | undefined)?.side ?? null;
		const view = getInvitationView(side);
		const names = `${view.firstNames} & ${view.secondNames}`;
		return {
			meta: [
				{ title: `Photobooth — ${names}` },
				{ name: "robots", content: "noindex, nofollow" },
			],
		};
	},
	component: PhotoboothRoute,
});

function PhotoboothRoute() {
	const { slug } = Route.useParams();
	return <PhotoboothPage slug={slug} />;
}
