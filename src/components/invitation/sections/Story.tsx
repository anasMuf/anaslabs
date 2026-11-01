import { Fragment } from "react";
import { invitation } from "#/data/invitation";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** Story section (Figma 384:2942): editorial timeline of three milestones. */
export default function Story() {
	const { sections, story } = invitation;

	return (
		<section
			id="kisah"
			className="snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-16 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.story.heading}
					intro={sections.story.intro}
				/>

				<ol className="flex w-full flex-col items-center py-10">
					{story.map((milestone, index) => (
						<Fragment key={milestone.title}>
							<li className="flex w-full flex-col items-center gap-3 text-center">
								{milestone.date ? (
									<p className="text-[10px] font-body leading-[1.4] tracking-[0.1em] text-inv-accent">
										{milestone.date}
									</p>
								) : null}
								<h3 className="font-display text-[27px] leading-[1.3]">
									{milestone.title}
								</h3>
								{milestone.body ? (
									<p className="text-[13px] font-body leading-[1.7] text-inv-muted">
										{milestone.body}
									</p>
								) : null}
							</li>

							{index < story.length - 1 ? (
								<li
									aria-hidden="true"
									className="flex w-3 flex-col items-center gap-[6px] py-[9px]"
								>
									<span className="h-[22px] w-px bg-inv-rule" />
									<span className="h-1 w-1 rounded-full bg-inv-accent" />
								</li>
							) : null}
						</Fragment>
					))}
				</ol>

				<Ornament />
			</Reveal>
		</section>
	);
}
