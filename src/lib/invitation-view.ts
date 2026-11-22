import { invitation } from "#/data/invitation";
import {
	buildInvitationView,
	type GuestSide,
} from "./invitation-personalization";

/**
 * Binds the raw `data/invitation.ts` copy to the personalisation rules, so the
 * page, its `<head>`, and the child routes all read the same view.
 */
export function getInvitationView(side: GuestSide | null) {
	return buildInvitationView({
		side,
		cover: invitation.cover,
		couple: invitation.couple,
		events: invitation.events,
		gifts: invitation.gifts,
		sides: invitation.sides,
		eventIntro: invitation.sections.event.intro,
	});
}
