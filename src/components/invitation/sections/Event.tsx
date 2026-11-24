import { Fragment } from "react";
import type { InvitationEvent } from "#/data/invitation";
import { formatEventDate } from "#/lib/invitation";
import { useInvitationContent } from "../InvitationContentProvider";
import MapsButton from "../ui/MapsButton";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** Event section (Figma 384:429): the celebration(s) this guest is invited to. */
export default function Event({
	events,
	intro,
}: {
	events: InvitationEvent[];
	intro: string;
}) {
	const { sections } = useInvitationContent();

	return (
		<section
			id="acara"
			className="invite-section snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-10 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading heading={sections.event.heading} intro={intro} />

				<div className="mt-3 flex w-full flex-col">
					{events.map((event, index) => (
						<Fragment key={event.id}>
							{index > 0 && <Ornament className="my-2" />}
							<EventCard event={event} />
						</Fragment>
					))}
				</div>
			</Reveal>
		</section>
	);
}

function EventCard({ event }: { event: InvitationEvent }) {
	return (
		<article className="flex flex-col items-center gap-3 py-3 text-center">
			<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-accent">
				{event.label}
			</p>

			<p className="font-display text-[30px] leading-[1.3]">
				{formatEventDate(event.date)}
			</p>

			{event.schedules ? (
				<dl className="grid w-fit max-w-full grid-cols-[auto_auto] items-baseline gap-x-3 gap-y-2">
					{event.schedules.map((schedule) => (
						<Fragment key={schedule.label}>
							<dt className="min-w-[90px] whitespace-nowrap text-right text-[12px] font-body font-semibold text-inv-accent">
								{schedule.label}
							</dt>
							<dd className="whitespace-nowrap text-left text-[13px] font-body leading-[1.65] text-inv-muted">
								{schedule.time}
							</dd>
						</Fragment>
					))}
				</dl>
			) : null}

			{event.time ? (
				<p className="text-[13px] font-body leading-[1.65] text-inv-muted">
					{event.time}
				</p>
			) : null}

			<p className="max-w-[300px] text-[12px] font-body leading-[1.6] text-inv-muted">
				{event.location.name}, {event.location.address}
			</p>

			<MapsButton
				href={event.location.mapsUrl}
				eventLabel={`${event.label}, ${event.location.name}`}
			/>
		</article>
	);
}
