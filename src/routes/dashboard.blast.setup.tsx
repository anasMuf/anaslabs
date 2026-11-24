import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChannelForm } from "#/components/dashboard/blast/ChannelForm";
import { listBlastChannels } from "#/lib/blast/channels";
import type { BlastChannelView } from "#/lib/blast/types";

export const Route = createFileRoute("/dashboard/blast/setup")({
	loader: async () => listBlastChannels(),
	component: BlastSetup,
});

function BlastSetup() {
	const initial = Route.useLoaderData();
	const [channels, setChannels] = useState<BlastChannelView[]>(
		initial.channels,
	);

	function handleUpdated(next: BlastChannelView) {
		setChannels((current) =>
			current.map((channel) =>
				channel.source === next.source ? next : channel,
			),
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{initial.error ? (
				<div className="rounded-3xl border border-inv-accent/40 bg-inv-accent/5 px-5 py-4">
					<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
						SETUP BELUM SELESAI
					</p>
					<p className="mt-2 font-body text-[11px] leading-relaxed text-inv-ink">
						{initial.error}
					</p>
				</div>
			) : null}

			<div className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					YANG PERLU DISIAPKAN
				</p>
				<ul className="mt-2 flex list-disc flex-col gap-1 pl-4 font-body text-[11px] leading-[1.7] text-inv-muted">
					<li>
						Dua device Wablas (Anas dan Mila), masing-masing sudah terhubung
						WhatsApp.
					</li>
					<li>
						Token dan secret key dari menu Device → Settings pada tiap device.
					</li>
					<li>Alamat server Wablas, mis. https://jogja.wablas.com.</li>
					<li>Kuota dan masa aktif device yang cukup untuk jumlah tamu.</li>
				</ul>
				<p className="mt-3 font-body text-[11px] leading-relaxed text-inv-muted">
					Token hanya dikirim ke server, dienkripsi, dan tidak pernah
					ditampilkan kembali di browser. Menyimpan kanal selalu diuji ke Wablas
					terlebih dahulu.
				</p>
			</div>

			{channels.map((channel) => (
				<ChannelForm
					key={channel.source}
					channel={channel}
					onUpdated={handleUpdated}
				/>
			))}
		</div>
	);
}
