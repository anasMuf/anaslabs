import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "#/components/dashboard/blast/TemplateEditor";
import { buildLinkPreview, resolveLinkVersion } from "#/lib/blast/link-preview";
import { getInvitationMeta } from "#/lib/blast/og";
import { listBlastTemplates } from "#/lib/blast/templates";
import { listGuestsPage } from "#/lib/guests";

export const Route = createFileRoute("/dashboard/blast/template")({
	loader: async () => {
		const [templates, page, meta] = await Promise.all([
			listBlastTemplates(),
			listGuestsPage({
				data: { limit: 30, offset: 0, delivery: "digital", source: "anas" },
			}),
			getInvitationMeta(),
		]);
		return {
			templates: templates.templates,
			guests: page.rows,
			guestTotal: page.total,
			linkPreview: buildLinkPreview(meta, resolveLinkVersion(meta.updatedAt)),
		};
	},
	component: BlastTemplatePage,
});

function BlastTemplatePage() {
	const { templates, guests, guestTotal, linkPreview } = Route.useLoaderData();

	return (
		<div className="flex flex-col gap-4">
			<p className="font-body text-[11px] leading-[1.7] text-inv-muted">
				Satu template per nomor pengirim. Variabel diisi otomatis untuk setiap
				tamu; pratinjau memakai tamu contoh yang bisa diganti.
			</p>
			<TemplateEditor
				initial={templates}
				guests={guests}
				guestTotal={guestTotal}
				linkPreview={linkPreview}
			/>
		</div>
	);
}
