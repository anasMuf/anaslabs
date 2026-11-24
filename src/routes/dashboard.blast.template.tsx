import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "#/components/dashboard/blast/TemplateEditor";
import { listBlastTemplates } from "#/lib/blast/templates";
import { listGuestsPage } from "#/lib/guests";

export const Route = createFileRoute("/dashboard/blast/template")({
	loader: async () => {
		const [templates, page] = await Promise.all([
			listBlastTemplates(),
			listGuestsPage({ data: { limit: 12, offset: 0 } }),
		]);
		return { templates: templates.templates, guests: page.rows };
	},
	component: BlastTemplatePage,
});

function BlastTemplatePage() {
	const { templates, guests } = Route.useLoaderData();

	return (
		<div className="flex flex-col gap-4">
			<p className="font-body text-[11px] leading-[1.7] text-inv-muted">
				Satu template per nomor pengirim. Variabel diisi otomatis untuk setiap
				tamu; pratinjau memakai tamu contoh yang bisa diganti.
			</p>
			<TemplateEditor initial={templates} guests={guests} />
		</div>
	);
}
