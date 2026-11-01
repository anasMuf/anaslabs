import { Link } from "@tanstack/react-router";
import { invitation } from "#/data/invitation";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** Photobooth entry (Figma 384:428). Opens the standalone photobooth tab. */
export default function Photobooth({ slug }: { slug: string }) {
	const { sections } = invitation;
	const copy = sections.photobooth;

	return (
		<section
			id="photobooth"
			className="invite-section snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-10 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading heading={copy.heading} intro={copy.intro} />

				<div className="flex flex-col items-center pt-6">
					<img
						src={copy.camera}
						alt=""
						width={245}
						height={283}
						loading="lazy"
						decoding="async"
						className="h-auto w-[245px]"
					/>
					<img
						src={copy.keepsake}
						alt=""
						width={260}
						height={108}
						loading="lazy"
						decoding="async"
						className="mt-2 h-auto w-[260px]"
					/>
				</div>

				<Link
					to="/invitation/$slug/photobooth"
					params={{ slug }}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-6 flex h-[52px] w-[232px] items-center justify-center rounded-full bg-inv-accent text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					{copy.cta}
					<span className="sr-only"> (membuka tab baru)</span>
				</Link>

				<Ornament className="mt-6" />
			</Reveal>
		</section>
	);
}
