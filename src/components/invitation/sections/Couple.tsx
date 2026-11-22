import { invitation } from "#/data/invitation";
import type { PersonView } from "#/lib/invitation-personalization";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

interface CoupleProps {
	/** Ordered for the guest's side; the labels stay with each person. */
	people: PersonView[];
}

/** Couple section (Figma 384:430): first person, bouquet, second person. */
export default function Couple({ people }: CoupleProps) {
	const { couple, sections } = invitation;

	return (
		<section
			id="mempelai"
			className="invite-section snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-16 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.couple.heading}
					intro={sections.couple.intro}
				/>

				<div className="mt-8 flex flex-col items-center">
					<Person {...people[0]} />

					<img
						src={couple.bouquet}
						alt=""
						width={174}
						height={184}
						loading="lazy"
						decoding="async"
						className="mt-5 mb-6 h-auto w-[174px]"
					/>

					<Person {...people[1]} />
				</div>

				<Ornament className="mt-8" />
			</Reveal>
		</section>
	);
}

function Person({ label, fullName, parents }: PersonView) {
	return (
		<div className="flex flex-col items-center text-center">
			<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-accent">
				{label}
			</p>
			<h3 className="mt-[13px] font-display text-[30px] leading-[1.3]">
				{fullName}
			</h3>
			<p className="mt-[17px] text-[13px] font-body leading-[1.65] text-inv-muted">
				{parents}
			</p>
		</div>
	);
}
