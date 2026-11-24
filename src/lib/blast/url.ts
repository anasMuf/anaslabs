const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/** URL pertama dalam pesan, tanpa tanda baca penutup. */
export function firstUrl(message: string): string | null {
	const match = message.match(URL_PATTERN);
	if (!match) return null;
	return match[0].replace(/[.,;:!?)\]]+$/g, "");
}
