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
	slots: readonly PhotoboothSlot[];
}

export interface PhotoboothConfig {
	scale: number;
	downloadName: string;
	/** Card copy, drawn by `drawComposition`. */
	card: {
		eyebrow: string;
		names: string;
		date: string;
	};
	layouts: Record<PhotoboothGrid, PhotoboothCardLayout>;
}
