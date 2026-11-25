import { useEffect, useRef, useState } from "react";
import { copyText } from "#/lib/clipboard";

type CopyState = "idle" | "copied" | "error";

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
