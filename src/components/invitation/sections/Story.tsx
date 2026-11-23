import { useEffect, useRef, useState } from "react";
import { A11y, EffectCards, Keyboard } from "swiper/modules";
import { Swiper, type SwiperClass, SwiperSlide } from "swiper/react";
import { useInvitationContent } from "../InvitationContentProvider";
import InkLine from "../ui/InkLine";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import RichText from "../ui/RichText";
import SectionHeading from "../ui/SectionHeading";

import "swiper/css";
import "swiper/css/effect-cards";

/**
 * Story section (Figma 384:2942): one swipeable card per chapter.
 *
 * Cards stack with Swiper's `cards` effect so each milestone reads like a
 * chapter of a book. `touchStartPreventDefault` stays off so a vertical swipe
 * over the deck still moves the page's snap scroller instead of trapping the
 * gesture inside the slider.
 */
export default function Story({ namesLabel }: { namesLabel: string }) {
	const { sections, story } = useInvitationContent();
	const swiperRef = useRef<SwiperClass | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	// User-driven swipes still work; only the snap-in transition is dropped.
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduceMotion(query.matches);

		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	return (
		<section
			id="kisah"
			className="invite-section snap-start flex h-dvh flex-col overflow-x-hidden overflow-y-auto no-scrollbar bg-inv-bg px-8 py-8 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center justify-center gap-5">
				<SectionHeading
					heading={sections.story.heading}
					intro={sections.story.intro}
				/>

				<Swiper
					modules={[EffectCards, Keyboard, A11y]}
					effect="cards"
					cardsEffect={{ perSlideOffset: 7, perSlideRotate: 2.5 }}
					grabCursor
					keyboard={{ enabled: true }}
					speed={reduceMotion ? 0 : 300}
					slideToClickedSlide
					touchStartPreventDefault={false}
					a11y={{
						enabled: true,
						containerMessage: "Kisah perjalanan kami",
						containerRoleDescriptionMessage: "kartu cerita",
						slideLabelMessage: "Bab {{index}} dari {{slidesLength}}",
					}}
					onSwiper={(instance) => {
						swiperRef.current = instance;
					}}
					onSlideChange={(instance) => {
						setActiveIndex(instance.activeIndex);
					}}
					tabIndex={0}
					className="invite-story-swiper"
					style={{
						width: "min(78vw, 288px)",
						height: "clamp(344px, 54dvh, 396px)",
					}}
				>
					{story.map((milestone, index) => (
						<SwiperSlide
							key={milestone.title ?? index}
							className="invite-story-card rounded-[22px]"
						>
							<article className="flex h-full flex-col bg-inv-card px-5 py-6">
								<div className="flex items-baseline justify-between gap-3">
									{/*<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.22em] text-inv-accent">
										{`Bab ${String(index + 1).padStart(2, "0")}`}
									</p>*/}
									{milestone.date ? (
										<p className="text-[10px] font-body leading-[1.4] tracking-[0.12em] text-inv-muted">
											{milestone.date}
										</p>
									) : null}
								</div>

								{milestone.title ? (
									<h3 className="mt-2 font-display text-[26px] leading-[1.25] text-inv-ink">
										{milestone.title}
									</h3>
								) : null}

								<InkLine className="my-3 h-0.5 w-10 shrink-0 text-inv-rule" />

								{milestone.body ? (
									<p className="text-[11.5px] font-body leading-[1.72] text-inv-muted">
										<RichText text={milestone.body} />
									</p>
								) : null}

								<div className="mt-auto flex items-center justify-between pt-4">
									<span className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-muted">
										{namesLabel}
									</span>
									<span className="text-[10px] font-body leading-[1.4] tracking-[0.18em] text-inv-accent">
										{index + 1} / {story.length}
									</span>
								</div>
							</article>
						</SwiperSlide>
					))}
				</Swiper>

				<nav
					className="flex items-center justify-center gap-1"
					aria-label="Navigasi bab cerita"
				>
					{story.map((milestone, index) => {
						const label = milestone.title
							? `Buka bab ${milestone.title}`
							: `Buka bab ${index + 1}`;

						return (
							<button
								key={milestone.title ?? index}
								type="button"
								onClick={() => swiperRef.current?.slideTo(index)}
								aria-label={label}
								aria-current={index === activeIndex ? "true" : undefined}
								className="group flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								<span
									className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
										index === activeIndex
											? "w-5 bg-inv-accent"
											: "w-1.5 bg-inv-rule group-hover:bg-inv-muted"
									}`}
								/>
							</button>
						);
					})}
				</nav>

				<Ornament />
			</Reveal>
		</section>
	);
}
