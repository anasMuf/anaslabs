import { useEffect } from "react";

/**
 * Blocks pinch-zoom and ctrl/⌘+wheel zoom while mounted.
 *
 * The invitation and photobooth are fixed, full-screen compositions where
 * accidental zoom breaks the layout. This is deliberately scoped to those
 * routes (not the portfolio) because disabling zoom is an accessibility
 * trade-off (WCAG 1.4.4).
 */
export function useLockZoom() {
	useEffect(() => {
		const preventDefault = (event: Event) => {
			event.preventDefault();
		};

		const preventMultiTouch = (event: TouchEvent) => {
			if (event.touches.length > 1) event.preventDefault();
		};

		const preventCtrlWheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey) event.preventDefault();
		};

		// Safari still emits gesture* events for pinch; Blink/Gecko honour
		// `touch-action: pan-y` (set on the page wrappers) instead.
		document.addEventListener("gesturestart", preventDefault);
		document.addEventListener("gesturechange", preventDefault);
		document.addEventListener("gestureend", preventDefault);
		document.addEventListener("touchmove", preventMultiTouch, {
			passive: false,
		});
		window.addEventListener("wheel", preventCtrlWheel, { passive: false });

		return () => {
			document.removeEventListener("gesturestart", preventDefault);
			document.removeEventListener("gesturechange", preventDefault);
			document.removeEventListener("gestureend", preventDefault);
			document.removeEventListener("touchmove", preventMultiTouch);
			window.removeEventListener("wheel", preventCtrlWheel);
		};
	}, []);
}
