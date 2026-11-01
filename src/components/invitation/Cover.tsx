import { invitation } from "#/data/invitation";
import { formatCoverDateRange } from "#/lib/invitation";

interface CoverProps {
	guestName: string;
}

/**
 * Cover section (Figma 384:431). The guest name is personalised per slug;
 * everything else comes from `src/data/invitation.ts`.
 */
export default function Cover({ guestName }: CoverProps) {
	const { cover } = invitation;
	const dateLabel = formatCoverDateRange(cover.startDate, cover.endDate);

	return (
		<section className="flex min-h-dvh flex-col items-center bg-inv-bg px-8 pt-[max(48px,14vh)] pb-10 text-center text-inv-ink">
			<img
				src={cover.ornament}
				alt=""
				width={125}
				height={98}
				fetchPriority="high"
				decoding="async"
				className="h-auto w-[125px]"
			/>

			<p className="mt-4 font-body text-[10px] uppercase tracking-[0.34em] text-inv-accent">
				{cover.eyebrow}
			</p>

			<h1 className="mt-[clamp(36px,7vh,60px)] font-display text-[clamp(44px,16vw,64px)] font-normal leading-[1.18]">
				<span className="block">{cover.firstNames}</span>
				<span className="mt-1 block">
					<span className="italic text-inv-accent">&amp;</span>{" "}
					{cover.secondNames}
				</span>
			</h1>

			<div className="mt-[clamp(36px,7vh,60px)] flex w-full max-w-[312px] items-center gap-4">
				<span className="h-px flex-1 bg-inv-ink/70" />
				<span className="shrink-0 font-body text-[12px] tracking-[0.06em]">
					{dateLabel}
				</span>
				<span className="h-px flex-1 bg-inv-ink/70" />
			</div>

			<div className="mt-[clamp(36px,7vh,60px)]">
				<p className="font-body text-[12px]">{cover.guestLabel}</p>
				<p className="mt-1 font-body text-[16px] font-bold">{guestName}</p>
			</div>

			<a
				href="#mempelai"
				className="mt-auto inline-flex min-h-[44px] items-center px-4 pt-[clamp(36px,7vh,60px)] font-body text-[12px] text-inv-muted transition-colors hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				{cover.scrollLabel}
			</a>
		</section>
	);
}
