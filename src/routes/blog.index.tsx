import { createFileRoute, Link } from "@tanstack/react-router";
import { allBlogs } from "content-collections";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "#/lib/site";

const canonical = `${SITE_URL}/blog`;
const pageTitle = `Articles | ${SITE_TITLE}`;

export const Route = createFileRoute("/blog/")({
	head: () => ({
		links: [{ rel: "canonical", href: canonical }],
		meta: [
			{ title: pageTitle },
			{ name: "description", content: SITE_DESCRIPTION },
		],
	}),
	component: BlogIndex,
});

function BlogIndex() {
	const posts = Array.from(
		new Map(
			[...allBlogs]
				.sort(
					(a, b) =>
						new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
				)
				.map((post) => [post.slug, post]),
		).values(),
	);

	return (
		<main className="grow pt-32 pb-20 px-6 max-w-5xl mx-auto">
			<header className="mb-16">
				<h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter text-white mb-4">
					Writing
				</h1>
				<p className="text-neutral-400 max-w-xl">
					Thoughts on fullstack development, distributed systems, and modern
					tooling.
				</p>
			</header>

			<div className="flex flex-col gap-0">
				{posts.map((post) => (
					<Link
						key={post.slug}
						to="/blog/$slug"
						params={{ slug: post.slug }}
						className="group flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8 py-6 border-b border-white/5 hover:border-white/10 transition-colors"
					>
						<time className="text-sm text-neutral-500 w-32 shrink-0">
							{new Date(post.pubDate).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
							})}
						</time>
						<div>
							<h2 className="text-lg font-medium tracking-tight text-neutral-200 group-hover:text-white transition-colors mb-2 flex items-center gap-2">
								{post.title}
								<span className="opacity-0 group-hover:opacity-100 transition-opacity">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="M7 7h10v10" />
										<path d="M7 17 17 7" />
									</svg>
								</span>
							</h2>
							<p className="text-sm text-neutral-400 line-clamp-2">
								{post.description}
							</p>
						</div>
					</Link>
				))}
			</div>
		</main>
	);
}
