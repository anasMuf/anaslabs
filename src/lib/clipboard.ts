/**
 * Copy text with a legacy fallback.
 *
 * `navigator.clipboard` only exists in a secure context; the dashboard can be
 * opened over plain HTTP on the LAN, so keep the old `execCommand` path.
 */
export async function copyText(value: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(value);
			return true;
		}
	} catch {
		// Clipboard API needs a secure context; fall back to the legacy path.
	}

	try {
		const textarea = document.createElement("textarea");
		textarea.value = value;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "fixed";
		textarea.style.top = "-1000px";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const copied = document.execCommand("copy");
		textarea.remove();
		return copied;
	} catch {
		return false;
	}
}
