import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import siteData from "#/data/site.json";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
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
		<html lang="id" className="scroll-smooth">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen antialiased">
				{children}
				<noscript>
					{/* Scroll-reveal content must stay readable without JS. */}
					<style>{`.reveal[data-hidden="true"]{opacity:1;transform:none}`}</style>
				</noscript>
				<Scripts />
			</body>
		</html>
	);
}
