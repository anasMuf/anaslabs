import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import InvitationAudio from "#/components/invitation/audio/InvitationAudio";
import InvitationSections from "#/components/invitation/InvitationSections";
import { markGuestOpened } from "#/lib/guests";
import { getInvitationView } from "#/lib/invitation-view";
import { useLockZoom } from "#/lib/use-lock-zoom";

const parentRoute = getRouteApi("/invitation/$slug");

export const Route = createFileRoute("/invitation/$slug/")({
	component: InvitationPage,
});

function InvitationPage() {
	const { guest, content } = parentRoute.useLoaderData();
	const { slug } = parentRoute.useParams();
	const view = getInvitationView(guest.side, content);

	useLockZoom();

	// First open only; the server function ignores later visits. Fire and forget,
	// so a tracking failure can never hold up the invitation itself.
	useEffect(() => {
		void markGuestOpened({ data: { slug } }).catch(() => undefined);
	}, [slug]);

	return (
		<main className="invite-scroller h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto no-scrollbar touch-pan-y bg-inv-bg font-body text-inv-ink">
			<InvitationSections
				slug={slug}
				guestName={guest.name}
				caption={guest.caption}
				view={view}
			/>
			<InvitationAudio url={content.music.enabled ? content.music.url : null} />
		</main>
	);
}
