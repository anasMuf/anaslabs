import { type ReactNode, useEffect, useRef, useState } from "react";

interface RevealProps {
	children: ReactNode;
	className?: string;
}

/**
 * Fades a section in when it scrolls into view.
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
				if (entries.some((entry) => entry.isIntersecting)) {
					setShown(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={ref} data-hidden={!shown} className={`reveal ${className}`}>
			{children}
		</div>
	);
}
