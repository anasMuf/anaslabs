import { Volume2, VolumeX } from "lucide-react";

/**
 * Floating music control for the invitation.
 *
 * Visible only after the guest's first interaction (the same gesture that lets
 * playback start). Bars animate while playing but stop under reduced motion.
 */
export default function MusicController({
	playing,
	onToggle,
}: {
	playing: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-label={playing ? "Matikan musik" : "Putar musik"}
			aria-pressed={playing}
			className="fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-inv-accent text-inv-bg shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
		>
			{playing ? (
				<span
					aria-hidden="true"
					className="absolute -top-4 left-1/2 flex h-3 -translate-x-1/2 items-end gap-0.5"
				>
					<span className="h-1.5 w-0.5 animate-pulse rounded-full bg-inv-accent motion-reduce:animate-none" />
					<span
						className="h-3 w-0.5 animate-pulse rounded-full bg-inv-accent motion-reduce:animate-none"
						style={{ animationDelay: "150ms" }}
					/>
					<span
						className="h-2 w-0.5 animate-pulse rounded-full bg-inv-accent motion-reduce:animate-none"
						style={{ animationDelay: "300ms" }}
					/>
				</span>
			) : null}
			{playing ? (
				<Volume2 className="h-5 w-5" />
			) : (
				<VolumeX className="h-5 w-5" />
			)}
		</button>
	);
}
