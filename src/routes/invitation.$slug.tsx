import montserratLatin from "@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2?url";
import playfairItalic from "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2?url";
import playfairLatin from "@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2?url";
import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { InvitationContentProvider } from "#/components/invitation/InvitationContentProvider";
import { ToastProvider } from "#/components/invitation/ui/Toast";
import {
	defaultOgImageUrl,
	resolveLinkVersion,
} from "#/lib/blast/link-preview";
import { getInvitationMeta } from "#/lib/blast/og";
import { getGuest } from "#/lib/guest";
import { getInvitationContent } from "#/lib/invitation-content";
import { defaultContent } from "#/lib/invitation-content-default";
import { getInvitationView } from "#/lib/invitation-view";
import { SITE_URL } from "#/lib/site";

/**
 * Preload the faces the cover uses, so the display heading is rendered with the
 * real font instead of swapping mid-paint. The invitation only uses Playfair
 * (normal + italic ampersand) and Montserrat; Inter is left to load on demand
 * because only small UI bits inherit it.
 */
function fontPreload(href: string) {
	return {
		rel: "preload",
		as: "font",
		type: "font/woff2",
		href,
		crossOrigin: "anonymous",
	} as const;
}

function ogImageMime(url: string): string {
	const path = url.split("?")[0]?.toLowerCase() ?? "";
	if (path.endsWith(".png")) return "image/png";
	if (path.endsWith(".webp")) return "image/webp";
	return "image/jpeg";
}

export const Route = createFileRoute("/invitation/$slug")({
	loader: async ({ params }) => {
		const [guest, content, meta] = await Promise.all([
			getGuest({ data: params.slug }),
			getInvitationContent(),
			getInvitationMeta(),
		]);
		if (!guest) throw notFound();
		return { guest, content, meta };
	},
	head: ({ loaderData, params }) => {
		const view = getInvitationView(
			loaderData?.guest.side ?? null,
			loaderData?.content ?? defaultContent,
		);
		const names = `${view.firstNames} & ${view.secondNames}`;
		const defaultTitle = `${names} — Undangan Pernikahan`;
		const defaultDescription = `Undangan pernikahan ${view.fullNamePair}, ${view.coverDateLabel}.`;
		const title = loaderData?.meta?.title?.trim() || defaultTitle;
		const description =
			loaderData?.meta?.description?.trim() || defaultDescription;
		const ogImage =
			loaderData?.meta?.imageUrl?.trim() ||
			defaultOgImageUrl(resolveLinkVersion(loaderData?.meta?.updatedAt));
		const ogImageType = ogImageMime(ogImage);
		// Dimensi hanya benar untuk gambar default 1200×630; gambar unggahan
		// pengguna bisa beda rasio, jadi jangan deklarasikan angka palsu.
		const hasCustomImage = Boolean(loaderData?.meta?.imageUrl?.trim());
		const canonicalUrl = `${SITE_URL}/invitation/${params.slug}`;

		return {
			meta: [
				{
					name: "viewport",
					content:
						"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
				},
				{ title },
				{ name: "description", content: description },
				{ name: "robots", content: "noindex, nofollow" },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "website" },
				{ property: "og:url", content: canonicalUrl },
				{ property: "og:site_name", content: "Anas & Mila" },
				{ property: "og:locale", content: "id_ID" },
				{ property: "og:image", content: ogImage },
				{ property: "og:image:secure_url", content: ogImage },
				{ property: "og:image:type", content: ogImageType },
				...(hasCustomImage
					? []
					: [
							{ property: "og:image:width", content: "1200" },
							{ property: "og:image:height", content: "630" },
						]),
				{ property: "og:image:alt", content: title },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: ogImage },
			],
			links: [
				fontPreload(playfairLatin),
				fontPreload(playfairItalic),
				fontPreload(montserratLatin),
			],
		};
	},
	component: InvitationLayout,
	notFoundComponent: InvitationNotFound,
});

/**
 * Shared guest lookup for the invitation page and its photobooth tab.
 *
 * The toast provider sits above both routes so a failure reported in the
 * photobooth (e.g. a rejected card) stays visible after the redirect to the wall.
 */
function InvitationLayout() {
	const { content } = Route.useLoaderData();

	return (
		<InvitationContentProvider content={content}>
			<ToastProvider>
				<Outlet />
			</ToastProvider>
		</InvitationContentProvider>
	);
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
