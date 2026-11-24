import { createFileRoute } from "@tanstack/react-router";
import { OgEditor } from "#/components/dashboard/blast/OgEditor";
import { getInvitationMetaForDashboard } from "#/lib/blast/og";

export const Route = createFileRoute("/dashboard/blast/og")({
	loader: async () => getInvitationMetaForDashboard(),
	component: BlastOg,
});

function BlastOg() {
	const result = Route.useLoaderData();

	if (!result.ok) {
		return (
			<div className="rounded-3xl border border-inv-accent/40 bg-inv-accent/5 px-5 py-4">
				<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent">
					METADATA OG BELUM SIAP
				</p>
				<p className="mt-2 font-body text-[11px] leading-relaxed text-inv-ink">
					{result.error}
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="font-body text-[11px] leading-[1.7] text-inv-muted">
				Metadata ini dipakai saat tautan undangan dibagikan (WhatsApp, Facebook,
				X). Kosongkan field untuk memakai nilai default dari konten undangan.
			</p>
			<OgEditor meta={result.meta} />
		</div>
	);
}
