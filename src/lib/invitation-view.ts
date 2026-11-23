import { defaultContent } from "./invitation-content-default";
import type { InvitationContent } from "./invitation-content-schema";
import {
	buildInvitationView,
	type GuestSide,
} from "./invitation-personalization";

/**
 * Binds stored content to the personalisation rules, so the page, its `<head>`,
 * and the child routes all read the same view.
 *
 * Defaults are used when a caller (e.g. `<head>` for a route without a loaded
 * document) cannot provide the content yet.
 */
export function getInvitationView(
	side: GuestSide | null,
	content: InvitationContent = defaultContent,
) {
	return buildInvitationView({
		side,
		cover: content.cover,
		couple: content.couple,
		events: content.events,
		gifts: content.gifts,
		sides: content.sides,
		eventIntro: content.sections.event.intro,
	});
}
