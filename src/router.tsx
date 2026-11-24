import {
	createRouter as createTanStackRouter,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Fallbacks for unmatched routes and runtime errors that escape every
 * route-level boundary. Without them TanStack Router renders a bare
 * `<p>Not Found</p>` and logs a warning on each 404.
 *
 * They match the dark public site because that is where stray URLs land;
 * the invitation and dashboard keep their own light components.
 */
function DefaultNotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0a0a] px-8 text-center font-sans text-neutral-300">
			<p className="font-display text-[30px] leading-tight text-white">
				Halaman tidak ditemukan
			</p>
			<p className="max-w-sm text-[13px] leading-[1.7] text-neutral-400">
				Alamat yang Anda buka tidak ada atau sudah dipindahkan.
			</p>
			<a
				href="/"
				className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[12px] font-medium text-neutral-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
			>
				Kembali ke beranda
			</a>
		</main>
	);
}

function DefaultError({ reset }: ErrorComponentProps) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0a0a] px-8 text-center font-sans text-neutral-300">
			<p className="font-display text-[30px] leading-tight text-white">
				Terjadi kesalahan
			</p>
			<p className="max-w-sm text-[13px] leading-[1.7] text-neutral-400">
				Halaman gagal dimuat. Coba muat ulang; kalau masih gagal, kembali ke
				beranda.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<button
					type="button"
					onClick={reset}
					className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[12px] font-medium text-neutral-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
				>
					Coba lagi
				</button>
				<a
					href="/"
					className="rounded-full px-5 py-2.5 text-[12px] font-medium text-neutral-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
				>
					Beranda
				</a>
			</div>
		</main>
	);
}

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,

		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: DefaultNotFound,
		defaultErrorComponent: DefaultError,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
