/**
 * Personalises the invitation copy for the guest's side of the family.
 *
 * Guests imported from the `anas` sheet belong to the groom's side and guests
 * from the `mila` sheet to the bride's side (`guests.source_sheet`). A guest
 * with no side (unknown slug, `/invitation/test`, or a row without a sheet)
 * keeps the default copy exactly as before.
 *
 * Pure function: no I/O, so the ordering and date rules are unit tested.
 */

import type { InvitationEvent, InvitationGiftAccount } from "#/data/invitation";
import { formatCoverDate, formatCoverDateRange } from "./invitation";

export type GuestSide = "groom" | "bride";

export interface PersonView {
	label: string;
	fullName: string;
	parents: string;
}

export interface InvitationViewInput {
	side: GuestSide | null;
	cover: {
		firstNames: string;
		secondNames: string;
		startDate: string;
		endDate: string;
	};
	couple: {
		groom: PersonView;
		bride: PersonView;
	};
	events: InvitationEvent[];
	gifts: InvitationGiftAccount[];
	sides: {
		groom: { eventIds: readonly string[] };
		bride: { eventIds: readonly string[] };
	};
	/** Copy for the "Hari Bahagia" intro; the couple names inside are reordered. */
	eventIntro: string;
}

export interface InvitationView {
	firstNames: string;
	secondNames: string;
	/** "20 Desember 2026" for one side, "19 - 20 Desember 2026" by default. */
	coverDateLabel: string;
	/** What the "Hari Bahagia" section renders, in order. */
	events: InvitationEvent[];
	/** Gift accounts; the guest's side is listed first, the other stays visible. */
	gifts: InvitationGiftAccount[];
	/** Couple section order (labels travel with each person). */
	people: PersonView[];
	/** "Muhammad Anas … dan Fajriyatul Kamila", ordered for the guest's side. */
	fullNamePair: string;
	/** `sections.event.intro` with the couple names in the same order. */
	eventIntro: string;
	/** "Anas & Mila", for compact labels such as the story footer. */
	namesLabel: string;
}

export function buildInvitationView(
	input: InvitationViewInput,
): InvitationView {
	const { cover, couple, events, gifts, sides, side } = input;
	const defaultPair = `${couple.groom.fullName} dan ${couple.bride.fullName}`;
	const defaultDateLabel = formatCoverDateRange(cover.startDate, cover.endDate);

	if (!side) {
		const firstNames = cover.firstNames;
		const secondNames = cover.secondNames;

		return {
			firstNames,
			secondNames,
			coverDateLabel: defaultDateLabel,
			events,
			gifts,
			people: [couple.groom, couple.bride],
			fullNamePair: defaultPair,
			eventIntro: input.eventIntro,
			namesLabel: `${firstNames} & ${secondNames}`,
		};
	}

	const groomFirst = side === "groom";
	const people = groomFirst
		? [couple.groom, couple.bride]
		: [couple.bride, couple.groom];
	const firstNames = groomFirst ? cover.firstNames : cover.secondNames;
	const secondNames = groomFirst ? cover.secondNames : cover.firstNames;
	const fullNamePair = `${people[0].fullName} dan ${people[1].fullName}`;

	const eventIds = new Set(sides[side].eventIds);
	const sideEvents = events.filter((event) => eventIds.has(event.id));
	// Defensive: a misconfigured side must still show a usable invitation.
	const visibleEvents = sideEvents.length > 0 ? sideEvents : events;
	const coverDateLabel = sideEvents.length
		? formatCoverDate(sideEvents[0].date)
		: defaultDateLabel;

	const sideGifts = [
		...gifts.filter((gift) => gift.side === side),
		...gifts.filter((gift) => gift.side !== side),
	];

	return {
		firstNames,
		secondNames,
		coverDateLabel,
		events: visibleEvents,
		// Both accounts stay visible; the guest's side is listed first.
		gifts: sideGifts,
		people,
		fullNamePair,
		eventIntro: input.eventIntro.replace(defaultPair, fullNamePair),
		namesLabel: `${firstNames} & ${secondNames}`,
	};
}
