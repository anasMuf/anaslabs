import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import projects from "#/data/projects.json";
import siteData from "#/data/site.json";
import { SITE_TITLE, SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/projects/$slug")({
	loader: ({ params }) => {
		const project = projects.find((p) => p.slug === params.slug);
		if (!project) throw notFound();
		return project;
	},
	head: ({ loaderData }) => ({
		links: [
			{ rel: "canonical", href: `${SITE_URL}/projects/${loaderData?.slug}` },
		],
		meta: [
			{ title: `${loaderData?.title ?? "Project"} | ${SITE_TITLE}` },
			{ name: "description", content: loaderData?.description ?? "" },
		],
	}),
	component: ProjectDetail,
});

function CheckCircle() {
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
			className="text-emerald-500 mt-0.5 shrink-0"
			aria-hidden="true"
		>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<path d="m9 11 3 3L22 4" />
		</svg>
	);
}

function ProjectIcon({ name }: { name: string }) {
	const cls = "text-neutral-800";
	if (name === "cpu")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.75"
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
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.75"
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
	if (name === "activity")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cls}
				aria-hidden="true"
			>
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
			</svg>
		);
	if (name === "wallet")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cls}
				aria-hidden="true"
			>
				<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
				<path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
				<path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
			</svg>
		);
	if (name === "clock")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cls}
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
		);
	if (name === "droplet")
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cls}
				aria-hidden="true"
			>
				<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
			</svg>
		);
	// shield (default)
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="80"
			height="80"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="0.75"
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

function ProjectDetail() {
	const project = Route.useLoaderData();

	return (
		<main className="grow pt-32 pb-20">
			<article className="px-6 max-w-4xl mx-auto pb-24 fade-in">
				{/* Back */}
				<Link
					to="/projects"
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
					Back to projects
				</Link>

				{/* Header */}
				<header className="mb-12">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter text-white mb-6">
						{project.title}
					</h1>
					<p className="text-lg text-neutral-400 max-w-2xl mb-8">
						{project.description}
					</p>
					<div className="flex flex-wrap gap-2">
						{project.tags.map((tag) => (
							<span
								key={tag}
								className="text-xs font-medium text-neutral-300 bg-white/5 border border-white/5 px-3 py-1.5 rounded-md"
							>
								{tag}
							</span>
						))}
					</div>
				</header>

				{/* Featured image placeholder */}
				<div className="w-full h-64 sm:h-96 bg-neutral-900/40 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center mb-16 relative">
					<ProjectIcon name={project.icon} />
					<div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
				</div>

				{/* Sections */}
				<div className="space-y-12 max-w-3xl">
					{project.sections.map((section) => (
						<section key={section.heading}>
							<h2 className="text-2xl font-medium tracking-tight text-white mb-4">
								{section.heading}
							</h2>
							<p className="text-base text-neutral-400 leading-relaxed">
								{section.body}
							</p>
							{section.bullets && (
								<ul className="mt-6 space-y-4 text-base text-neutral-400 leading-relaxed">
									{section.bullets.map((bullet) => (
										<li key={bullet.title} className="flex items-start gap-3">
											<CheckCircle />
											<span>
												<strong className="text-white">{bullet.title}:</strong>{" "}
												{bullet.text}
											</span>
										</li>
									))}
								</ul>
							)}
						</section>
					))}

					{/* CTA */}
					<div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
						<div className="text-center sm:text-left">
							<h3 className="text-lg font-medium text-white">
								Interested in a similar solution?
							</h3>
							<p className="text-sm text-neutral-500 mt-1">
								Let's discuss how we can build something great together.
							</p>
						</div>
						<a
							href={`mailto:${siteData.email}`}
							className="text-sm font-medium text-neutral-950 bg-white hover:bg-neutral-200 px-6 py-3 rounded-full transition-colors flex items-center gap-2 whitespace-nowrap"
						>
							Contact Me
						</a>
					</div>
				</div>
			</article>
		</main>
	);
}
