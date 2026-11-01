import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

async function copyText(value: string): Promise<boolean> {
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

interface CopyButtonProps {
	value: string;
	label?: string;
	copiedLabel?: string;
}

/** "SALIN" pill from Figma 409:10 with inline success/error feedback. */
export default function CopyButton({
	value,
	label = "Salin",
	copiedLabel = "Tersalin",
}: CopyButtonProps) {
	const [state, setState] = useState<CopyState>("idle");
	const timer = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	const handleClick = async () => {
		const copied = await copyText(value);
		setState(copied ? "copied" : "error");

		if (timer.current !== null) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setState("idle"), 2000);
	};

	return (
		<button
			type="button"
			onClick={() => void handleClick()}
			className="relative shrink-0 rounded-[20px] border border-inv-rule px-3.5 py-[5px] font-body text-[10px] uppercase tracking-[0.06em] text-inv-accent transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:bg-inv-accent hover:text-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
		>
			<span aria-live="polite">
				{state === "copied" ? copiedLabel : state === "error" ? "Gagal" : label}
			</span>
		</button>
	);
}
