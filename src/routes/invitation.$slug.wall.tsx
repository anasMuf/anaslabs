import { createFileRoute } from "@tanstack/react-router";
import WallPage from "#/components/invitation/wall/WallPage";
import { invitation } from "#/data/invitation";
import { listWallCards } from "#/lib/wall";

export const Route = createFileRoute("/invitation/$slug/wall")({
	loader: async () => ({ cards: await listWallCards({ data: {} }) }),
	head: () => {
		const names = `${invitation.cover.firstNames} & ${invitation.cover.secondNames}`;
		return {
			meta: [
				{ title: `Photo Wall — ${names}` },
				{ name: "robots", content: "noindex, nofollow" },
			],
		};
	},
	component: WallRoute,
});

function WallRoute() {
	const { cards } = Route.useLoaderData();
	const { slug } = Route.useParams();

	return <WallPage slug={slug} cards={cards} />;
}
