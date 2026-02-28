import { MDXContent } from "@content-collections/mdx/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allBlogs } from "content-collections";
import parse from "html-react-parser";
import { MdxCallout } from "#/components/MdxCallout";
import { MdxMetrics } from "#/components/MdxMetrics";
import siteData from "#/data/site.json";
import { SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/blog/$slug")({
	loader: ({ params }) => {
		const post = Array.from(
			new Map(
				[...allBlogs]
					.sort(
						(a, b) =>
							new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
					)
					.map((entry) => [entry.slug, entry]),
			).values(),
		).find((entry) => entry.slug === params.slug);
		if (!post) throw notFound();
		return post;
	},
	head: ({ loaderData, params }) => {
		const title = loaderData?.title ?? "Post";
		const description = loaderData?.description ?? "";
		const image = loaderData?.heroImage;
		const meta: Array<Record<string, string>> = [
			{ title },
			{ name: "description", content: description },
		];
		if (image) {
			meta.push({
				property: "og:image",
				content: image.startsWith("http") ? image : `${SITE_URL}${image}`,
			});
		}
		return {
			links: [{ rel: "canonical", href: `${SITE_URL}/blog/${params.slug}` }],
			meta,
		};
	},
	component: BlogPost,
});

function BlogPost() {
	const post = Route.useLoaderData();

	return (
		<main className="grow pt-32 pb-20">
			<article className="px-6 max-w-3xl mx-auto pb-24 fade-in">
				{/* Back */}
				<Link
					to="/blog"
					className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white mb-12 transition-colors"
				>
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
						<path d="m12 19-7-7 7-7M19 12H5" />
					</svg>
					Back to articles
				</Link>

				{/* Header */}
				<header className="mb-12 border-b border-white/5 pb-10">
					<time className="text-sm font-medium text-emerald-500 mb-4 block">
						Published on{" "}
						{new Date(post.pubDate).toLocaleDateString("en-US", {
							month: "long",
							day: "numeric",
							year: "numeric",
						})}
					</time>
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tighter text-white mb-6 leading-tight">
						{post.title}
					</h1>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-sm font-medium text-white">
							A
						</div>
						<div>
							<div className="text-sm font-medium text-neutral-200">
								{siteData.name}
							</div>
							<div className="text-xs text-neutral-500">{siteData.role}</div>
						</div>
					</div>
				</header>

				{/* Hero image */}
				{post.heroImage ? (
					<img
						src={post.heroImage}
						alt=""
						className="mb-10 w-full rounded-2xl object-cover max-h-80"
					/>
				) : null}

				{/* Content */}
				<div className="prose prose-invert prose-neutral max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-p:text-neutral-400 prose-li:text-neutral-400 prose-strong:text-white prose-a:text-emerald-400 prose-code:text-neutral-200 prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-white/5">
					{post.mdx ? (
						<MDXContent
							code={post.mdx}
							components={{ MdxCallout, MdxMetrics }}
						/>
					) : (
						<div>{parse(post.html ?? "")}</div>
					)}
				</div>

				{/* CTA */}
				<div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
					<div className="text-center sm:text-left">
						<h3 className="text-lg font-medium text-white">
							Enjoyed this article?
						</h3>
						<p className="text-sm text-neutral-500 mt-1">
							Let's talk about building something together.
						</p>
					</div>
					<a
						href={`mailto:${siteData.email}`}
						className="text-sm font-medium text-neutral-950 bg-white hover:bg-neutral-200 px-6 py-3 rounded-full transition-colors flex items-center gap-2 whitespace-nowrap"
					>
						Get in touch
					</a>
				</div>
			</article>
		</main>
	);
}
