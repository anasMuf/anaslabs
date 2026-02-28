import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import siteData from "#/data/site.json";
import Footer from "../components/Footer";
import Header from "../components/Header";

import appCss from "../styles.css?url";

const ogImageMeta = siteData.avatar
	? [
			{ property: "og:image", content: siteData.avatar },
			{ name: "twitter:image", content: siteData.avatar },
		]
	: [];

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "anaslabs | Context Engineer" },
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
