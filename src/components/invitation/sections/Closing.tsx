import { invitation } from "#/data/invitation";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** Closing section (Figma 384:427). */
export default function Closing() {
	const { sections, closing, cover } = invitation;

	return (
		<section
			id="penutup"
			className="snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-16 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center text-center">
				<SectionHeading
					heading={sections.closing.heading}
					intro={sections.closing.intro}
				/>

				<Ornament className="mt-[60px]" />

				<div className="mt-[60px] flex flex-col items-center gap-4">
					<h3 className="whitespace-pre-line font-display text-[30px] leading-[1.3]">
						{closing.heading}
					</h3>
					<p className="text-[13px] font-body leading-[1.65] text-inv-muted">
						{closing.body}
					</p>
				</div>

				<div className="mt-[60px] flex flex-col items-center gap-2">
					<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-accent">
						{closing.label}
					</p>
					<p className="font-display text-[30px] leading-[1.3]">
						<span className="block">{cover.firstNames}</span>
						<span className="block">
							<span className="italic text-inv-accent">&amp;</span>{" "}
							{cover.secondNames}
						</span>
					</p>
				</div>

				<Ornament className="mt-[60px]" />
			</Reveal>
		</section>
	);
}
