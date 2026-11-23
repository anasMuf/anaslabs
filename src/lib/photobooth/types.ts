/**
 * Photobooth contract.
 *
 * A layout is expressed in the Figma template's units and multiplied by
 * `scale` when drawn, so the on-screen card and the downloaded file are
 * rendered from the same numbers.
 */

export type PhotoboothGrid = 1 | 2 | 4;

/** 0 disables the countdown. */
export type PhotoboothTimer = 0 | 3 | 5;

export interface PhotoboothSlot {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface PhotoboothTextLine {
	value: string;
	/** Top-left of the text box, in Figma units. */
	x: number;
	y: number;
	/** Box width used for centring; the text itself is never wrapped. */
	width: number;
	fontFamily: string;
	fontSize: number;
	fontWeight?: number;
	/** Extra space between glyphs, in Figma units. */
	letterSpacing?: number;
	color?: string;
	align?: "left" | "center" | "right";
}

export interface PhotoboothFrame {
	/** Public URL of a transparent PNG/WebP overlay. */
	url: string;
	/** Top-left of the overlay, in Figma units. */
	x: number;
	y: number;
	/** Drawn width; height follows the image aspect ratio. */
	width: number;
}

export interface PhotoboothLayout {
	canvas: {
		width: number;
		height: number;
		/** Corner radius of the printed card, in Figma units. */
		radius: number;
		background: string;
	};
	/** One slot per captured photo, in capture order. */
	slots: PhotoboothSlot[];
	text: PhotoboothTextLine[];
	/** Global background image, drawn above the fallback colour, below photos. */
	backgroundImage?: PhotoboothFrame;
	/** Overlays drawn above the photos, below the text, in array order. */
	overlays: PhotoboothFrame[];
	/** Figma units → output pixels. 3 renders the 348-unit card at 1044 px. */
	scale: number;
}

export interface PhotoboothSettings {
	layouts: Record<PhotoboothGrid, PhotoboothLayout>;
	/** Base name for the downloaded file (without extension). */
	downloadName?: string;
}

/** Content-only layout: geometry as authored in Figma, before styling. */
export interface PhotoboothCardLayout {
	width: number;
	height: number;
	/** Top of the three text lines, in Figma units. */
	textY: number;
	/** Left of the text box; defaults to 60 (centred 228-unit box). */
	textX?: number;
	/** Per-layout overlays, up to 5; array order is the stacking order. */
	overlays?: PhotoboothFrame[];
	slots: readonly PhotoboothSlot[];
}

export interface PhotoboothConfig {
	scale: number;
	downloadName: string;
	/** Card background, `#RRGGBB`; defaults to white. */
	background?: string;
	/** Corner radius in Figma units; defaults to 10. */
	radius?: number;
	/**
	 * Global background image (x/y may be negative for panning). Drawn above the
	 * fallback colour and below the photos; applies to every layout.
	 */
	backgroundImage?: PhotoboothFrame;
	/**
	 * Legacy global overlay (pre per-layout overlays). New content stores
	 * `layouts[*].overlays`; the read path migrates this value once.
	 */
	frame?: PhotoboothFrame;
	/** Card copy, drawn by `drawComposition`. */
	card: {
		eyebrow: string;
		names: string;
		date: string;
	};
	layouts: Record<PhotoboothGrid, PhotoboothCardLayout>;
}
