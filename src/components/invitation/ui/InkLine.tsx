import { type InkLineVariant, inkLineStroke } from "./ink-line-paths";

interface InkLineProps {
	/** Which traced stroke to draw; `a` and `b` are the pair used in Figma. */
	variant?: InkLineVariant;
	/** Sizing, colour (`text-*`) and layout classes; the fill follows `currentColor`. */
	className?: string;
}

/**
 * A hand-drawn rule from Figma (`357:2215` / `357:2218`).
 *
 * The path lives in a 76x2 viewBox and is stretched with
 * `preserveAspectRatio="none"`, so the caller decides the width — the uneven
 * ends of the drawn stroke survive any length. Give it a height of 2px
 * (`h-0.5`) to match the design, and a `text-*` class to colour it:
 *
 * ```tsx
 * <InkLine className="h-0.5 flex-1 text-inv-ink" />
 * <InkLine variant="b" className="h-0.5 w-[52px] text-inv-rule" />
 * ```
 *
 * Decorative by design, so it is hidden from assistive technology; pass a
 * `title` through the surrounding markup if the rule ever carries meaning.
 */
export default function InkLine({
	variant = "a",
	className = "",
}: InkLineProps) {
	return (
		<svg
			viewBox="0 0 76 2"
			preserveAspectRatio="none"
			aria-hidden="true"
			focusable="false"
			className={className}
		>
			<path d={inkLineStroke[variant]} fill="currentColor" />
		</svg>
	);
}
