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
import { useLockZoom } from "#/lib/use-lock-zoom";

const parentRoute = getRouteApi("/invitation/$slug");

export const Route = createFileRoute("/invitation/$slug/")({
	component: InvitationPage,
});

function InvitationPage() {
	const guest = parentRoute.useLoaderData();
	const { slug } = parentRoute.useParams();

	useLockZoom();

	return (
		<main className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto no-scrollbar touch-pan-y bg-inv-bg font-body text-inv-ink">
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
