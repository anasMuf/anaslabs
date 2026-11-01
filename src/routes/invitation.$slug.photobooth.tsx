import { createFileRoute } from "@tanstack/react-router";
import PhotoboothPage from "#/components/invitation/photobooth/PhotoboothPage";
import { invitation } from "#/data/invitation";

export const Route = createFileRoute("/invitation/$slug/photobooth")({
	head: () => {
		const names = `${invitation.cover.firstNames} & ${invitation.cover.secondNames}`;
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
