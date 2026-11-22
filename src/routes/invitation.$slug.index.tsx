import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import InvitationAudio from "#/components/invitation/audio/InvitationAudio";
import Cover from "#/components/invitation/Cover";
import Closing from "#/components/invitation/sections/Closing";
import Couple from "#/components/invitation/sections/Couple";
import Event from "#/components/invitation/sections/Event";
import Gift from "#/components/invitation/sections/Gift";
import Photobooth from "#/components/invitation/sections/Photobooth";
import Story from "#/components/invitation/sections/Story";
import { invitation } from "#/data/invitation";
import { markGuestOpened } from "#/lib/guests";
import { getInvitationView } from "#/lib/invitation-view";
import { useLockZoom } from "#/lib/use-lock-zoom";

const parentRoute = getRouteApi("/invitation/$slug");

export const Route = createFileRoute("/invitation/$slug/")({
	component: InvitationPage,
});

function InvitationPage() {
	const guest = parentRoute.useLoaderData();
	const { slug } = parentRoute.useParams();
	const view = getInvitationView(guest.side);

	useLockZoom();

	// First open only; the server function ignores later visits. Fire and forget,
	// so a tracking failure can never hold up the invitation itself.
	useEffect(() => {
		void markGuestOpened({ data: { slug } }).catch(() => undefined);
	}, [slug]);

	return (
		<main className="invite-scroller h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto no-scrollbar touch-pan-y bg-inv-bg font-body text-inv-ink">
			<Cover
				guestName={guest.name}
				caption={guest.caption}
				firstNames={view.firstNames}
				secondNames={view.secondNames}
				dateLabel={view.coverDateLabel}
			/>
			<Couple people={view.people} />
			<Event events={view.events} intro={view.eventIntro} />
			<Story namesLabel={view.namesLabel} />
			<Photobooth slug={slug} />
			<Gift gifts={view.gifts} />
			<Closing firstNames={view.firstNames} secondNames={view.secondNames} />
			<InvitationAudio url={invitation.music} />
		</main>
	);
}
