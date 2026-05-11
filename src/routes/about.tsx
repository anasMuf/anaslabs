import { createFileRoute } from "@tanstack/react-router";
import siteData from "#/data/site.json";

export const Route = createFileRoute("/about")({
	head: () => {
		const title = `Tentang | anaslabs`;
		const description =
			"Seorang Context Engineer dan Fullstack Developer yang spesialis dalam membangun aplikasi berperforma tinggi dan sistem cerdas.";
		const url = "https://anaslabs.my.id/about";
		const ogImage = "https://anaslabs.my.id/profile.png";

		return {
			links: [{ rel: "canonical", href: url }],
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: url },
				{ property: "og:type", content: "website" },
				{ property: "og:image", content: ogImage },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: ogImage },
			],
		};
	},
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
					Halo, saya Anas.
				</h1>

				<div className="space-y-5 text-base text-neutral-400 leading-relaxed">
					<p>
						Saya adalah seorang Context Engineer dan Fullstack Developer yang
						berbasis di web. Saya spesialis dalam membangun aplikasi berperforma
						tinggi yang menjembatani sistem cerdas dengan antarmuka pengguna
						yang indah dan responsif.
					</p>
					<p>
						Toolkit saya mencakup seluruh stack — mulai dari React dan TanStack
						di bagian frontend, hingga HonoJS, ExpressJS, dan Laravel di bagian
						backend, dengan PostgreSQL dan MySQL sebagai lapisan data. Saya
						sangat tertarik pada edge computing, arsitektur type-safe, dan
						developer experience.
					</p>
					<p>
						Saat sedang tidak menulis kode, saya biasanya membaca tentang
						distributed systems, berkontribusi pada open source, atau
						mengeksplorasi bagaimana AI dapat meningkatkan alur kerja developer.
					</p>
				</div>

				{/* Skills */}
				<div className="mt-12">
					<h2 className="text-lg font-medium text-white mb-4">
						Stack teknologi
					</h2>
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

				{/* Licenses & Certifications */}
				<div className="mt-12">
					<h2 className="text-lg font-medium text-white mb-6">
						Lisensi & sertifikasi
					</h2>
					<div className="space-y-8">
						{siteData.certifications.map((cert) => (
							<div
								key={cert.title}
								className="group relative flex flex-col p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
							>
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
									<div>
										<h3 className="text-white font-medium">{cert.title}</h3>
										<p className="text-sm text-neutral-500">
											{cert.issuer} • {cert.date}
										</p>
									</div>
									{cert.predicate && (
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit">
											{cert.predicate} Predikat
										</span>
									)}
								</div>
								<p className="text-sm text-neutral-400 mb-6 leading-relaxed">
									{cert.description}
								</p>
								<div className="mt-auto">
									<a
										href={cert.verifyUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-neutral-300 transition-colors"
									>
										Tampilkan sertifikat
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
									</a>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Contact */}
				<div className="mt-12 pt-10 border-t border-white/5">
					<h2 className="text-lg font-medium text-white mb-2">Hubungi saya</h2>
					<p className="text-sm text-neutral-500 mb-4">
						Terbuka untuk peluang baru, kolaborasi, dan percakapan menarik.
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
