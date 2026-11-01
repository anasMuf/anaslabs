import { type ReactNode, useEffect, useRef, useState } from "react";

interface RevealProps {
	children: ReactNode;
	className?: string;
}

/**
 * Fades a section in when it enters the viewport and hides it again on exit, so
 * the animation replays every time the section is scrolled back into view.
 *
 * Content is visible without JS and for visitors who ask for reduced motion:
 * both cases are handled in CSS (`src/styles.css`), so the server-rendered
 * markup never leaves the page blank.
 */
export default function Reveal({ children, className = "" }: RevealProps) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [shown, setShown] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		if (
			typeof IntersectionObserver === "undefined" ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			setShown(true);
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry) setShown(entry.isIntersecting);
			},
			// Hide only once the section is mostly out of view, otherwise the
			// content would fade mid-scroll.
			{ threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			data-hidden={!shown}
			className={`reveal my-auto ${className}`}
		>
			{children}
		</div>
	);
}
