interface SectionHeadingProps {
	heading: string;
	intro: string;
}

/** Shared section heading: 38px Playfair title + 13px Montserrat intro. */
export default function SectionHeading({
	heading,
	intro,
}: SectionHeadingProps) {
	return (
		<header className="flex flex-col items-center gap-3 text-center">
			<h2 className="whitespace-pre-line font-display text-[38px] leading-[1.2] text-inv-ink">
				{heading}
			</h2>
			<p className="font-body text-[13px] leading-[1.7] text-inv-muted">
				{intro}
			</p>
		</header>
	);
}
