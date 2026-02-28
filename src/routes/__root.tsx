import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import siteData from "#/data/site.json";
import Footer from "../components/Footer";
import Header from "../components/Header";

import appCss from "../styles.css?url";

const domain = "https://anaslabs.my.id";
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

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "anaslabs | Context Engineer" },
			{ property: "og:title", content: "anaslabs | Context Engineer" },
			{ property: "og:description", content: siteData.description },
			{ property: "og:url", content: domain },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "anaslabs | Context Engineer" },
			{ name: "twitter:description", content: siteData.description },
			...ogImageMeta,
		],

		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			...(siteData.avatar ? [{ rel: "icon", href: siteData.avatar }] : []),
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="scroll-smooth">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased text-neutral-300 selection:bg-neutral-800 selection:text-white relative min-h-screen flex flex-col bg-[#0a0a0a]">
				{/* Background grid */}
				<div className="fixed inset-0 z-[-1] bg-grid pointer-events-none" />
				{/* Ambient blobs */}
				<div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[120px] pointer-events-none" />
				<div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
				<Header />
				{children}
				<Footer />
				<Scripts />
			</body>
		</html>
	);
}
