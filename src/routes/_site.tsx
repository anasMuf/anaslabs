import { createFileRoute, Outlet } from "@tanstack/react-router";
import siteData from "#/data/site.json";
import Footer from "../components/Footer";
import Header from "../components/Header";

const domain = "https://anaslabs.my.id";
const pageTitle = "anaslabs | Context Engineer";
const ogImageUrl = siteData.avatar
	? siteData.avatar.startsWith("http")
		? siteData.avatar
		: `${domain}${siteData.avatar}`
	: "";

const ogImageMeta = ogImageUrl
	? [
			{ property: "og:image", content: ogImageUrl },
			{ name: "twitter:image", content: ogImageUrl },
		]
	: [];

export const Route = createFileRoute("/_site")({
	head: () => ({
		meta: [
			{ title: pageTitle },
			{ property: "og:title", content: pageTitle },
			{ property: "og:description", content: siteData.description },
			{ property: "og:url", content: domain },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: pageTitle },
			{ name: "twitter:description", content: siteData.description },
			...ogImageMeta,
		],
	}),
	component: SiteLayout,
});

function SiteLayout() {
	return (
		<div className="relative flex min-h-screen flex-col bg-[#0a0a0a] font-sans text-neutral-300 selection:bg-neutral-800 selection:text-white">
			{/* Background grid */}
			<div className="fixed inset-0 z-[-1] bg-grid pointer-events-none" />
			{/* Ambient blobs */}
			<div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[120px] pointer-events-none" />
			<div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
			<Header />
			<Outlet />
			<Footer />
		</div>
	);
}
