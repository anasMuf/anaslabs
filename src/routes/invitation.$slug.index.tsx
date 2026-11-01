import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import InvitationAudio from "#/components/invitation/audio/InvitationAudio";
import Cover from "#/components/invitation/Cover";
import Closing from "#/components/invitation/sections/Closing";
import Couple from "#/components/invitation/sections/Couple";
import Event from "#/components/invitation/sections/Event";
import Gift from "#/components/invitation/sections/Gift";
import Photobooth from "#/components/invitation/sections/Photobooth";
import Story from "#/components/invitation/sections/Story";
import { invitation } from "#/data/invitation";

const parentRoute = getRouteApi("/invitation/$slug");

export const Route = createFileRoute("/invitation/$slug/")({
	component: InvitationPage,
});

function InvitationPage() {
	const guest = parentRoute.useLoaderData();
	const { slug } = parentRoute.useParams();

	return (
		<main className="bg-inv-bg font-body text-inv-ink">
			<Cover guestName={guest.name} />
			<Couple />
			<Event />
			<Story />
			<Photobooth slug={slug} />
			<Gift />
			<Closing />
			<InvitationAudio url={invitation.music} />
		</main>
	);
}
