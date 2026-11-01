import { invitation } from "#/data/invitation";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

interface PersonProps {
	label: string;
	fullName: string;
	parents: string;
}

/** Couple section (Figma 384:430): groom, bouquet, bride. */
export default function Couple() {
	const { couple, sections } = invitation;

	return (
		<section
			id="mempelai"
			className="bg-inv-bg px-8 py-24 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.couple.heading}
					intro={sections.couple.intro}
				/>

				<div className="mt-8 flex flex-col items-center">
					<Person {...couple.groom} />

					<img
						src={couple.bouquet}
						alt=""
						width={174}
						height={184}
						loading="lazy"
						decoding="async"
						className="mt-5 mb-6 h-auto w-[174px]"
					/>

					<Person {...couple.bride} />
				</div>

				<Ornament className="mt-8" />
			</Reveal>
		</section>
	);
}

function Person({ label, fullName, parents }: PersonProps) {
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
