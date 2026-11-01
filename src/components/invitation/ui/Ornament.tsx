/**
 * Repeating decorative divider from the Figma template: a fine rule, an
 * italic ampersand in the accent colour, and another fine rule.
 *
 * The rules use `InkLine`, the same hand-drawn stroke as the cover date row, so
 * every divider in the invitation shares one line style.
 */

import InkLine from "./InkLine";

export default function Ornament({ className = "" }: { className?: string }) {
	return (
		<div
			className={`flex items-center justify-center gap-3 ${className}`}
			aria-hidden="true"
		>
			<InkLine className="h-px w-[52px] text-inv-rule" />
			<span className="font-display text-[20px] italic leading-none text-inv-accent">
				&amp;
			</span>
			<InkLine variant="b" className="h-px w-[52px] text-inv-rule" />
		</div>
	);
}
