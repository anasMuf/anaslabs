/**
 * Tiny inline emphasis syntax for invitation copy: `**like this**`.
 *
 * Wedding copy lives in `src/data/invitation.ts` as plain strings, so a full
 * markdown parser would be overkill — but a single highlighted clause per
 * paragraph is a common request. Unmatched markers are left as literal text.
 */

export interface TextSegment {
	text: string;
	strong: boolean;
	/** Offset in the source string; unique per segment, so it can key a list. */
	start: number;
}

const EMPHASIS = /\*\*([\s\S]+?)\*\*/g;

/** Splits `**bold**` runs into plain and strong segments, in order. */
export function parseEmphasis(input: string): TextSegment[] {
	const segments: TextSegment[] = [];
	let cursor = 0;

	for (const match of input.matchAll(EMPHASIS)) {
		const start = match.index;
		const end = start + match[0].length;
		if (start > cursor) {
			segments.push({
				text: input.slice(cursor, start),
				strong: false,
				start: cursor,
			});
		}
		segments.push({ text: match[1], strong: true, start });
		cursor = end;
	}

	if (cursor < input.length) {
		segments.push({ text: input.slice(cursor), strong: false, start: cursor });
	}

	return segments;
}
