/**
 * Repeating decorative divider from the Figma template: a fine rule, an
 * italic ampersand in the accent colour, and another fine rule.
 */

export default function Ornament({ className = "" }: { className?: string }) {
	return (
		<div
			className={`flex items-center justify-center gap-3 ${className}`}
			aria-hidden="true"
		>
			<span className="h-px w-[52px] bg-inv-rule" />
			<span className="font-display text-[20px] italic leading-none text-inv-accent">
				&amp;
			</span>
			<span className="h-px w-[52px] bg-inv-rule" />
		</div>
	);
}
