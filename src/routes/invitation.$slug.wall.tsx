import { createFileRoute } from "@tanstack/react-router";
import WallPage from "#/components/invitation/wall/WallPage";
import { invitation } from "#/data/invitation";
import { listWallCards } from "#/lib/wall";

export const Route = createFileRoute("/invitation/$slug/wall")({
	validateSearch: (search: Record<string, unknown>): { admin?: string } =>
		typeof search.admin === "string" && search.admin.length > 0
			? { admin: search.admin }
			: {},
	loader: async () => {
		try {
			return { cards: await listWallCards({ data: {} }), failed: false };
		} catch (error) {
			// A missing env or a Supabase hiccup must not blank the page for guests:
			// log the real cause for the owner and let the UI show a retry notice.
			console.error("[wall] gagal memuat kartu:", error);
			return { cards: [], failed: true };
		}
	},
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
	const { cards, failed } = Route.useLoaderData();
	const { slug } = Route.useParams();
	const { admin } = Route.useSearch();

	return (
		<WallPage slug={slug} cards={cards} failed={failed} adminParam={admin} />
	);
}
