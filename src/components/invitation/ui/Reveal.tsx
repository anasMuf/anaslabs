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

	// Scale the content down when it would not fit the section, so every section
	// stays exactly one viewport tall. The outer scroller always snaps and the
	// gesture never gets trapped inside a section.
	useEffect(() => {
		const node = ref.current;
		const section = node?.closest("section");
		if (!node || !section) return;
		if (typeof ResizeObserver === "undefined") return;
		if (typeof CSS === "undefined" || !CSS.supports("zoom", "1")) return;

		let frame = 0;

		const applyFit = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const styles = window.getComputedStyle(section);
				const padding =
					Number.parseFloat(styles.paddingTop) +
					Number.parseFloat(styles.paddingBottom);
				const available = section.clientHeight - padding;
				const current = Number.parseFloat(node.style.zoom || "1") || 1;
				// `offsetHeight` lies while `zoom` is applied; the rendered rect does not.
				const rendered = node.getBoundingClientRect().height;

				if (!Number.isFinite(available) || available <= 0) return;
				if (!Number.isFinite(rendered) || rendered <= 0) return;
				// One pixel of slack absorbs sub-pixel rounding.
				if (rendered <= available + 1) return;

				// Shrink-only keeps this monotonic: a tighter zoom can never make the
				// content overflow again, so the observer settles instead of oscillating.
				// The floor stops the text from getting unreadably small; below it the
				// section falls back to its own scroll.
				const next = Math.max(0.8, (current * available) / rendered);
				if (Math.abs(next - current) < 0.005) return;

				node.style.zoom = Math.min(current, next).toFixed(3);
			});
		};

		// Rotating the device or resizing the window can only relax the constraint,
		// so start over from 100% and let the next pass re-fit from scratch.
		const reset = () => {
			node.style.zoom = "1";
			applyFit();
		};

		applyFit();
		const observer = new ResizeObserver(applyFit);
		// The section covers viewport changes; the node covers late-arriving content
		// such as web fonts, which would otherwise silently overflow.
		observer.observe(section);
		observer.observe(node);
		window.addEventListener("resize", reset);
		document.fonts?.ready.then(applyFit).catch(() => {});

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", reset);
			cancelAnimationFrame(frame);
		};
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
