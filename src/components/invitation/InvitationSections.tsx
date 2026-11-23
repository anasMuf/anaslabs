import type { InvitationView } from "#/lib/invitation-personalization";
import Cover from "./Cover";
import Closing from "./sections/Closing";
import Couple from "./sections/Couple";
import Event from "./sections/Event";
import Gift from "./sections/Gift";
import Photobooth from "./sections/Photobooth";
import Story from "./sections/Story";

interface InvitationSectionsProps {
	slug: string;
	guestName: string;
	caption: string | null;
	view: InvitationView;
}

/**
 * The invitation body shared by the guest page and the dashboard preview, so
 * the preview can never drift from what guests actually see.
 */
export default function InvitationSections({
	slug,
	guestName,
	caption,
	view,
}: InvitationSectionsProps) {
	return (
		<>
			<Cover
				guestName={guestName}
				caption={caption}
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
		</>
	);
}
