interface MapsButtonProps {
	href: string;
	label?: string;
	/** Distinguishes repeated "Petunjuk Arah" links for screen readers. */
	eventLabel?: string;
}

/** "Petunjuk Arah" pill — Figma 384:345 (cream fill, 1px rule border). */
export default function MapsButton({
	href,
	label = "Petunjuk Arah",
	eventLabel,
}: MapsButtonProps) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={
				eventLabel ? `${label} — ${eventLabel} (membuka tab baru)` : undefined
			}
			className="relative inline-flex items-center justify-center rounded-full border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[12px] font-semibold text-inv-accent transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-inv-accent hover:text-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
		>
			{label}
		</a>
	);
}
