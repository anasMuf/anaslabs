import type { ReactNode } from "react";

export function MdxCallout({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<aside className="not-prose my-6 rounded-xl border border-white/10 bg-white/5 p-4">
			<p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
				{title}
			</p>
			<div className="text-sm leading-7 text-neutral-300">{children}</div>
		</aside>
	);
}
