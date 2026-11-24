import type { LinkPreviewInfo } from "#/lib/blast/link-preview";
import { firstUrl } from "#/lib/blast/url";

/** Balon pesan bergaya WhatsApp + kartu preview tautan (OG). */
export function MessagePreview({
	message,
	label,
	linkPreview,
}: {
	message: string;
	label: string;
	linkPreview?: LinkPreviewInfo;
}) {
	const url = firstUrl(message);

	return (
		<div className="rounded-3xl border border-inv-rule bg-inv-card px-4 py-3">
			<div className="flex items-center justify-between gap-2">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					PRATINJAU WHATSAPP
				</p>
				<p className="font-body text-[10px] text-inv-muted">{label}</p>
			</div>
			<div className="mt-2 rounded-2xl bg-[#dcf8c6] px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(52,54,46,0.6)]">
				<p className="whitespace-pre-wrap break-words font-body text-[11.5px] leading-[1.65] text-[#1f2c22]">
					{message}
				</p>

				{url && linkPreview ? (
					<a
						href={url}
						target="_blank"
						rel="noreferrer"
						className="mt-2 block overflow-hidden rounded-xl border border-black/10 bg-[#f4f6f4] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						<img
							src={linkPreview.imageUrl}
							alt="Pratinjau gambar tautan undangan"
							loading="lazy"
							className="aspect-[1200/630] w-full object-cover"
						/>
						<div className="px-2.5 py-2">
							<p className="font-body text-[9px] uppercase tracking-[0.12em] text-[#667781]">
								{linkPreview.host}
							</p>
							<p className="mt-0.5 line-clamp-2 font-body text-[11px] font-semibold leading-snug text-[#111b21]">
								{linkPreview.title}
							</p>
							<p className="mt-0.5 line-clamp-2 font-body text-[10px] leading-relaxed text-[#667781]">
								{linkPreview.description}
							</p>
						</div>
					</a>
				) : null}
			</div>
			<p className="mt-2 text-right font-body text-[10px] text-inv-muted">
				{message.length} karakter
			</p>
		</div>
	);
}
