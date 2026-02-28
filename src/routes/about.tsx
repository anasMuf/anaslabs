import { createFileRoute } from "@tanstack/react-router";
import siteData from "#/data/site.json";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<main className="grow pt-32 pb-20 px-6 max-w-5xl mx-auto">
			<div className="max-w-2xl">
				{/* Avatar */}
				{siteData.avatar ? (
					<img
						src={siteData.avatar}
						alt={siteData.name}
						className="w-16 h-16 rounded-full border border-white/10 object-cover mb-8"
						style={{ objectPosition: "center 8px" }}
					/>
				) : (
					<div className="w-16 h-16 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-2xl font-medium text-white mb-8">
						{siteData.name[0].toUpperCase()}
					</div>
				)}

				<h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter text-white mb-6 leading-tight">
					Hey, I'm Anas.
				</h1>

				<div className="space-y-5 text-base text-neutral-400 leading-relaxed">
					<p>
						I'm a Context Engineer and Fullstack Developer based in the web. I
						specialise in building high-performance applications that bridge
						intelligent systems with beautiful, responsive user interfaces.
					</p>
					<p>
						My toolkit spans the full stack — from React and TanStack on the
						frontend, to HonoJS, ExpressJS, and Laravel on the backend, with
						PostgreSQL and MySQL as my data layers. I'm particularly interested
						in edge computing, type-safe architectures, and developer
						experience.
					</p>
					<p>
						When I'm not writing code I'm usually reading about distributed
						systems, contributing to open source, or exploring how AI can
						augment developer workflows.
					</p>
				</div>

				{/* Skills */}
				<div className="mt-12">
					<h2 className="text-lg font-medium text-white mb-4">Tech stack</h2>
					<div className="flex flex-wrap gap-2">
						{siteData.techStack.map((tech) => (
							<span
								key={tech.label}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300"
							>
								{tech.label}
							</span>
						))}
					</div>
				</div>

				{/* Contact */}
				<div className="mt-12 pt-10 border-t border-white/5">
					<h2 className="text-lg font-medium text-white mb-2">Get in touch</h2>
					<p className="text-sm text-neutral-500 mb-4">
						Open to new opportunities, collaborations, and interesting
						conversations.
					</p>
					<a
						href={`mailto:${siteData.email}`}
						className="inline-flex items-center gap-2 text-sm font-medium text-neutral-950 bg-white hover:bg-neutral-200 px-5 py-2.5 rounded-full transition-colors"
					>
						{siteData.email}
					</a>
				</div>
			</div>
		</main>
	);
}
