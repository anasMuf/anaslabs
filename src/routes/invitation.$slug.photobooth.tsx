import { createFileRoute } from "@tanstack/react-router";
import PhotoboothPage from "#/components/invitation/photobooth/PhotoboothPage";
import { defaultContent } from "#/lib/invitation-content-default";
import type { InvitationContent } from "#/lib/invitation-content-schema";
import type { GuestSide } from "#/lib/invitation-personalization";
import { getInvitationView } from "#/lib/invitation-view";

export const Route = createFileRoute("/invitation/$slug/photobooth")({
	head: ({ matches }) => {
		const parent = matches.find(
			(match) => (match.routeId as string) === "/invitation/$slug",
		);
		const loaderData = parent?.loaderData as
			| { guest?: { side?: GuestSide | null }; content?: InvitationContent }
			| undefined;
		const side = loaderData?.guest?.side ?? null;
		const view = getInvitationView(side, loaderData?.content ?? defaultContent);
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
