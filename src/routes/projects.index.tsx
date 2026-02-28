import { createFileRoute, Link } from "@tanstack/react-router";
import projects from "#/data/projects.json";
import { SITE_TITLE, SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/projects/")({
	head: () => ({
		links: [{ rel: "canonical", href: `${SITE_URL}/projects` }],
		meta: [
			{ title: `Projects | ${SITE_TITLE}` },
			{ name: "description", content: "Selected works and case studies." },
		],
	}),
	component: ProjectsIndex,
});

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

function ProjectsIndex() {
	return (
		<main className="grow pt-32 pb-20 px-6 max-w-5xl mx-auto">
			<header className="mb-16">
				<h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter text-white mb-4">
					All Projects
				</h1>
				<p className="text-neutral-400 max-w-xl">
					A collection of selected works spanning fullstack web apps, APIs, and
					distributed systems.
				</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{projects.map((project) => (
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
							<h2 className="text-xl font-medium tracking-tight text-white mb-3 flex items-center justify-between">
								{project.title}
								<span className="text-neutral-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0">
									<ArrowUpRight />
								</span>
							</h2>
							<p className="text-sm text-neutral-400 leading-relaxed">
								{project.shortDescription}
							</p>
						</div>
					</Link>
				))}
			</div>
		</main>
	);
}
