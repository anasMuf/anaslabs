import { Fragment } from "react";
import { parseEmphasis } from "#/lib/rich-text";

/**
 * Renders invitation copy that may contain `**emphasis**` markers.
 *
 * Plain strings render unchanged (no wrapper element), so existing copy keeps
 * its current markup; emphasised runs become `<strong>` inside the parent's
 * text flow.
 */
export default function RichText({ text }: { text: string }) {
	const segments = parseEmphasis(text);
	if (segments.every((segment) => !segment.strong)) return <>{text}</>;

	return (
		<>
			{segments.map((segment) =>
				segment.strong ? (
					<strong key={segment.start} className="font-semibold">
						{segment.text}
					</strong>
				) : (
					<Fragment key={segment.start}>{segment.text}</Fragment>
				),
			)}
		</>
	);
}
