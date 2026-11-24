/** Balon pesan bergaya WhatsApp untuk pratinjau template. */
export function MessagePreview({
	message,
	label,
}: {
	message: string;
	label: string;
}) {
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
			</div>
			<p className="mt-2 text-right font-body text-[10px] text-inv-muted">
				{message.length} karakter
			</p>
		</div>
	);
}
