import type { WallCard } from "#/lib/wall";

interface WallTileProps {
	card: WallCard;
	onOpen: (card: WallCard) => void;
}

/**
 * One wall entry: framed photo, guest name and a preview of the message.
 * Voice notes are only played from the dialog so the grid stays quiet.
 */
export default function WallTile({ card, onOpen }: WallTileProps) {
	return (
		<button
			type="button"
			onClick={() => onOpen(card)}
			className="group block w-full overflow-hidden rounded-2xl border border-inv-rule/70 bg-inv-card text-left transition-shadow hover:shadow-[0_8px_24px_rgba(52,54,46,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
		>
			<img
				src={card.thumbUrl || card.photoUrl}
				alt={`Potret dari ${card.guestName}`}
				width={348}
				height={530}
				loading="lazy"
				decoding="async"
				className="block h-auto w-full bg-inv-rule/25"
			/>

			<div className="px-3 pb-3 pt-2.5">
				<p className="text-[12px] font-semibold leading-snug text-inv-ink">
					{card.guestName}
				</p>

				{card.message ? (
					<p className="mt-1 line-clamp-3 text-[11px] leading-[1.65] text-inv-muted">
						{card.message}
					</p>
				) : null}

				{card.audioUrl ? (
					<span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] text-inv-accent">
						<svg
							width="11"
							height="11"
							viewBox="0 0 24 24"
							aria-hidden="true"
							focusable="false"
							fill="currentColor"
						>
							<path d="M4 9h3l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7 6.5 6.5 0 0 0 0-7Z" />
						</svg>
						Ucapan suara
					</span>
				) : null}
			</div>
		</button>
	);
}
