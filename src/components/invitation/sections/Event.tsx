import { Fragment } from "react";
import type { InvitationEvent } from "#/data/invitation";
import { invitation } from "#/data/invitation";
import { formatEventDate } from "#/lib/invitation";
import MapsButton from "../ui/MapsButton";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** Event section (Figma 384:429): Akad Nikah card, ornament, Unduh Mantu card. */
export default function Event() {
	const { events, sections } = invitation;

	return (
		<section id="acara" className="bg-inv-bg px-8 py-24 font-body text-inv-ink">
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.event.heading}
					intro={sections.event.intro}
				/>

				<div className="mt-6 flex w-full flex-col">
					{events.map((event, index) => (
						<Fragment key={event.id}>
							{index > 0 && <Ornament className="my-6" />}
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
		<article className="flex flex-col items-center gap-4 py-6 text-center">
			<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-accent">
				{event.label}
			</p>

			<p className="font-display text-[30px] leading-[1.3]">
				{formatEventDate(event.date)}
			</p>

			{event.schedules ? (
				<dl className="flex flex-col gap-2">
					{event.schedules.map((schedule) => (
						<div
							key={schedule.label}
							className="flex w-[168px] items-center gap-2"
						>
							<dt className="w-[90px] shrink-0 text-left text-[12px] font-body font-semibold text-inv-accent">
								{schedule.label}
							</dt>
							<dd className="text-left text-[13px] font-body leading-[1.65] text-inv-muted">
								{schedule.time}
							</dd>
						</div>
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
