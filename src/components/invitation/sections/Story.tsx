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
			className="invite-section snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-8 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.story.heading}
					intro={sections.story.intro}
				/>

				<ol className="flex w-full flex-col items-center py-2">
					{story.map((milestone, index) => (
						<Fragment key={milestone.title ?? index}>
							<li className="flex w-full flex-col items-center gap-1 text-center">
								{milestone.date ? (
									<p className="text-[11px] font-body leading-[1.4] tracking-[0.12em] text-inv-accent">
										{milestone.date}
									</p>
								) : null}
								{milestone.title ? (
									<h3 className="font-display text-[27px] leading-[1.3]">
										{milestone.title}
									</h3>
								) : null}
								{milestone.body ? (
									<p className="text-[13px] font-body leading-[1.7] text-inv-muted">
										{milestone.body}
									</p>
								) : null}
							</li>

							{index < story.length - 1 ? (
								<li
									aria-hidden="true"
									className="flex w-3 flex-col items-center gap-[4px] py-[4px]"
								>
									<span className="h-[20px] w-px bg-inv-rule" />
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
