import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { invitation } from "#/data/invitation";
import { getGuest } from "#/lib/guest";
import { formatCoverDateRange } from "#/lib/invitation";
import { SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/invitation/$slug")({
	loader: async ({ params }) => {
		const guest = await getGuest({ data: params.slug });
		if (!guest) throw notFound();
		return guest;
	},
	head: () => {
		const names = `${invitation.cover.firstNames} & ${invitation.cover.secondNames}`;
		const title = `${names} — Undangan Pernikahan`;
		const description = `Undangan pernikahan ${
			invitation.couple.groom.fullName
		} dan ${invitation.couple.bride.fullName}, ${formatCoverDateRange(
			invitation.cover.startDate,
			invitation.cover.endDate,
		)}.`;
		const ogImage = `${SITE_URL}/invitation/og.jpg`;

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ name: "robots", content: "noindex, nofollow" },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "website" },
				{ property: "og:image", content: ogImage },
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{ property: "og:image:alt", content: title },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:image", content: ogImage },
			],
		};
	},
	component: InvitationLayout,
	notFoundComponent: InvitationNotFound,
});

/** Shared guest lookup for the invitation page and its photobooth tab. */
function InvitationLayout() {
	return <Outlet />;
}

function InvitationNotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center bg-inv-bg px-8 text-center font-body text-inv-ink">
			<h1 className="font-display text-[32px]">Undangan tidak ditemukan</h1>
			<p className="mt-3 max-w-xs text-[13px] leading-relaxed text-inv-muted">
				Tautan undangan ini tidak berlaku. Silakan hubungi kami untuk
				mendapatkan tautan yang benar.
			</p>
			<Link
				to="/"
				className="mt-8 inline-flex min-h-[44px] items-center rounded-full border border-inv-ink/30 px-5 text-[12px] tracking-[0.08em] transition-colors hover:bg-inv-ink hover:text-inv-bg"
			>
				Kembali ke beranda
			</Link>
		</main>
	);
}
