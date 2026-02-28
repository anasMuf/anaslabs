import { createFileRoute, Link } from "@tanstack/react-router";
import { allBlogs } from "content-collections";
import projects from "#/data/projects.json";
import siteData from "#/data/site.json";

export const Route = createFileRoute("/")({ component: Home });

// Minimal inline SVG icons keyed by name
function ProjectIcon({ name }: { name: string }) {
	const cls =
		"text-neutral-700 group-hover:scale-110 transition-transform duration-500";
	if (name === "cpu")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cls}
				aria-hidden="true"
			>
				<rect x="4" y="4" width="16" height="16" rx="2" />
				<rect x="9" y="9" width="6" height="6" />
				<path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
			</svg>
		);
	if (name === "bar-chart")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cls}
				aria-hidden="true"
			>
				<line x1="18" x2="18" y1="20" y2="10" />
				<line x1="12" x2="12" y1="20" y2="4" />
				<line x1="6" x2="6" y1="20" y2="14" />
			</svg>
		);
	// shield
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="48"
			height="48"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cls}
			aria-hidden="true"
		>
			<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			<path d="M12 8v4M12 16h.01" />
		</svg>
	);
}

function ArrowUpRight() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
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
	);
}

function Home() {
	const recentPosts = [...allBlogs]
		.sort(
			(a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
		)
		.slice(0, 3);

	const normalProjects = projects.filter((p) => !p.wide);
	const wideProjects = projects.filter((p) => p.wide);

	return (
		<main className="grow pt-32 pb-20">
			{/* ===== Hero ===== */}
			<section className="px-6 max-w-5xl mx-auto flex flex-col items-start md:items-center md:text-center pt-10 pb-24">
				{siteData.available && (
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 mb-8 backdrop-blur-sm">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
						</span>
						Available for new opportunities
					</div>
				)}

				<h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter mb-6 text-white leading-tight">
					Context Engineer &amp; <br className="hidden md:block" /> Fullstack
					Developer.
				</h1>

				<p className="text-base md:text-lg text-neutral-400 max-w-2xl mb-12 md:mx-auto">
					{siteData.description}
				</p>

				{/* Tech stack pills */}
				<div className="flex flex-wrap items-center md:justify-center gap-3 max-w-3xl">
					{siteData.techStack.map((tech) => (
						<span
							key={tech.label}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300"
						>
							{tech.label}
						</span>
					))}
				</div>
			</section>

			{/* ===== Projects ===== */}
			<section
				id="projects"
				className="py-20 px-6 max-w-5xl mx-auto border-t border-white/5"
			>
				<div className="flex items-center justify-between mb-12">
					<h2 className="text-2xl font-medium tracking-tight text-white">
						Selected Works
					</h2>
					<Link
						to="/projects"
						className="text-sm font-medium text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
					>
						View all
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
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</Link>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{normalProjects.map((project) => (
						<Link
							key={project.slug}
							to="/projects/$slug"
							params={{ slug: project.slug }}
							className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/2 p-6 sm:p-8 hover:bg-white/4 transition-all duration-300 h-full"
						>
							<div>
								<div className="flex flex-wrap gap-2 mb-6">
									{project.tags.map((tag) => (
										<span
											key={tag}
											className="text-xs font-medium text-neutral-300 bg-white/5 border border-white/5 px-2 py-1 rounded"
										>
											{tag}
										</span>
									))}
								</div>
								<h3 className="text-xl font-medium tracking-tight text-white mb-3 flex items-center justify-between">
									{project.title}
									<span className="text-neutral-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0">
										<ArrowUpRight />
									</span>
								</h3>
								<p className="text-sm text-neutral-400 leading-relaxed mb-8">
									{project.shortDescription}
								</p>
							</div>
							<div className="w-full h-48 bg-neutral-900/50 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center relative">
								<ProjectIcon name={project.icon} />
							</div>
						</Link>
					))}

					{wideProjects.map((project) => (
						<Link
							key={project.slug}
							to="/projects/$slug"
							params={{ slug: project.slug }}
							className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/2 p-6 sm:p-8 hover:bg-white/4 transition-all duration-300 h-full md:col-span-2"
						>
							<div className="flex flex-col md:flex-row gap-8">
								<div className="flex-1">
									<div className="flex flex-wrap gap-2 mb-6">
										{project.tags.map((tag) => (
											<span
												key={tag}
												className="text-xs font-medium text-neutral-300 bg-white/5 border border-white/5 px-2 py-1 rounded"
											>
												{tag}
											</span>
										))}
									</div>
									<h3 className="text-xl font-medium tracking-tight text-white mb-3 flex items-center gap-2">
										{project.title}
										<span className="text-neutral-500 group-hover:text-white transition-colors">
											<ArrowUpRight />
										</span>
									</h3>
									<p className="text-sm text-neutral-400 leading-relaxed max-w-lg">
										{project.shortDescription}
									</p>
								</div>
								<div className="w-full md:w-1/3 h-40 md:h-auto bg-neutral-900/50 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
									<ProjectIcon name={project.icon} />
								</div>
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* ===== Articles ===== */}
			<section
				id="articles"
				className="py-20 px-6 max-w-5xl mx-auto border-t border-white/5"
			>
				<h2 className="text-2xl font-medium tracking-tight text-white mb-12">
					Recent Writing
				</h2>
				<div className="flex flex-col gap-0">
					{recentPosts.map((post) => (
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
								<h3 className="text-lg font-medium tracking-tight text-neutral-200 group-hover:text-white transition-colors mb-2 flex items-center gap-2">
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
								</h3>
								<p className="text-sm text-neutral-400 line-clamp-2">
									{post.description}
								</p>
							</div>
						</Link>
					))}
				</div>
			</section>
		</main>
	);
}
