import { Link } from "@tanstack/react-router";
import siteData from "#/data/site.json";

export default function Header() {
	return (
		<nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
			<div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
				<Link
					to="/"
					className="tracking-tighter font-medium text-lg text-white hover:text-neutral-200 transition-colors"
				>
					{siteData.name}
				</Link>

				<div className="hidden sm:flex items-center gap-8 text-sm font-medium text-neutral-400">
					<a href="/#projects" className="hover:text-white transition-colors">
						Projects
					</a>
					<Link to="/blog" className="hover:text-white transition-colors">
						Articles
					</Link>
					<Link to="/about" className="hover:text-white transition-colors">
						About
					</Link>
				</div>

				<a
					href={`mailto:${siteData.email}`}
					className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-full transition-all flex items-center gap-2"
				>
					Get in touch
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
				</a>
			</div>
		</nav>
	);
}
