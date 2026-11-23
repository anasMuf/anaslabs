import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLockZoom } from "#/lib/use-lock-zoom";
import {
	deleteWallCard,
	verifyWallAdminToken,
	type WallCard,
} from "#/lib/wall";
import { useInvitationContent } from "../InvitationContentProvider";
import Ornament from "../ui/Ornament";
import WallDeleteDialog from "./WallDeleteDialog";
import WallDialog from "./WallDialog";
import WallTile from "./WallTile";

interface WallPageProps {
	slug: string;
	cards: WallCard[];
	/** True when the loader could not reach Supabase; guests get a retry notice. */
	failed?: boolean;
	/** `?admin=<token>` from the URL; verified on the server before any UI shows. */
	adminParam?: string;
}

/**
 * Photo wall: the landing page behind the invitation's photobooth section.
 *
 * Guests see every published card here, and only get to the camera through the
 * primary action, so the wall reads as a guestbook rather than a tool screen.
 */
export default function WallPage({
	slug,
	cards,
	failed = false,
	adminParam,
}: WallPageProps) {
	useLockZoom();
	const { sections } = useInvitationContent();
	const copy = sections.wall;
	const navigate = useNavigate();
	const router = useRouter();
	const [active, setActive] = useState<WallCard | null>(null);
	const [pendingDelete, setPendingDelete] = useState<WallCard | null>(null);
	const [adminToken, setAdminToken] = useState<string | null>(null);
	const [newCardId] = useState<string | null>(() => {
		if (typeof window === "undefined") return null;
		const id = window.sessionStorage.getItem("wall:new-card");
		if (id) window.sessionStorage.removeItem("wall:new-card");
		return id;
	});

	useEffect(() => {
		if (!newCardId) return;
		document
			.getElementById(`wall-card-${newCardId}`)
			?.scrollIntoView({ block: "center", behavior: "smooth" });
	}, [newCardId]);

	// Admin mode: the token is verified server-side, then kept in sessionStorage
	// and stripped from the URL so it does not linger in the address bar or
	// history. Without a valid token nothing is rendered.
	useEffect(() => {
		const candidate =
			adminParam || window.sessionStorage.getItem("wall:admin-token");
		if (!candidate) return;

		let cancelled = false;

		void verifyWallAdminToken({ data: { token: candidate } })
			.then((result) => {
				if (cancelled) return;
				if (result.ok) {
					window.sessionStorage.setItem("wall:admin-token", candidate);
					setAdminToken(candidate);
				} else {
					window.sessionStorage.removeItem("wall:admin-token");
					setAdminToken(null);
				}
			})
			.catch(() => undefined)
			.finally(() => {
				if (!cancelled && adminParam) {
					void navigate({
						to: "/invitation/$slug/wall",
						params: { slug },
						search: {},
						replace: true,
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [adminParam, navigate, slug]);

	const exitAdmin = () => {
		window.sessionStorage.removeItem("wall:admin-token");
		setAdminToken(null);
	};

	return (
		<main className="min-h-dvh bg-inv-bg font-body text-inv-ink">
			<div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-5">
				<div className="flex items-center justify-between gap-3">
					<Link
						to="/invitation/$slug"
						params={{ slug }}
						className="inline-flex min-h-[44px] items-center gap-1.5 -ml-1 rounded-full px-2 text-[12px] text-inv-muted transition-colors hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							aria-hidden="true"
							focusable="false"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M15 6l-6 6 6 6" />
						</svg>
						{copy.back}
					</Link>

					<span className="text-[10px] uppercase tracking-[0.24em] text-inv-muted">
						{copy.eyebrow}
					</span>
				</div>

				<header className="mt-7 text-center">
					<h1 className="font-display text-[34px] leading-[1.15]">
						{copy.heading}
					</h1>
					<p className="mx-auto mt-3 max-w-[300px] text-[12px] leading-[1.7] text-inv-muted">
						{copy.intro}
					</p>
				</header>

				<Link
					to="/invitation/$slug/photobooth"
					params={{ slug }}
					className="mx-auto mt-6 flex h-[52px] w-full max-w-[320px] items-center justify-center gap-2 rounded-full bg-inv-accent text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						aria-hidden="true"
						focusable="false"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.7"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M4 8.5h2.5L8 6h8l1.5 2.5H20v10H4z" />
						<circle cx="12" cy="13" r="3.2" />
					</svg>
					{copy.cta}
				</Link>

				{adminToken ? (
					<div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-2.5">
						<p className="text-[11px] leading-[1.6] text-inv-muted">
							Mode admin · ketuk ikon hapus pada kartu yang ingin dibuang.
						</p>
						<button
							type="button"
							onClick={exitAdmin}
							className="shrink-0 whitespace-nowrap font-body text-[11px] text-inv-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Keluar
						</button>
					</div>
				) : null}

				{failed ? (
					<output className="mt-6 block rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 text-center">
						<p className="text-[12px] leading-[1.6] text-inv-muted">
							Wall belum bisa dimuat. Periksa koneksi lalu muat ulang halaman.
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="mt-2 inline-flex min-h-[44px] items-center rounded-full border border-inv-ink/30 px-4 text-[12px] text-inv-ink transition-colors hover:bg-inv-ink hover:text-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Muat ulang
						</button>
					</output>
				) : null}

				{cards.length ? (
					<ul className="mt-8 columns-2 gap-3 sm:columns-3 [&>li]:mb-3">
						{cards.map((card) => (
							<li
								key={card.id}
								id={`wall-card-${card.id}`}
								className="relative break-inside-avoid"
							>
								<WallTile
									card={card}
									onOpen={setActive}
									highlight={card.id === newCardId}
								/>

								{adminToken ? (
									<button
										type="button"
										onClick={() => setPendingDelete(card)}
										aria-label={`Hapus kartu ${card.guestName}`}
										className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-inv-bg/90 text-inv-accent shadow-[0_2px_8px_rgba(52,54,46,0.2)] backdrop-blur transition-colors hover:bg-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
									>
										<svg
											width="15"
											height="15"
											viewBox="0 0 24 24"
											aria-hidden="true"
											focusable="false"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.7"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
										</svg>
									</button>
								) : null}
							</li>
						))}
					</ul>
				) : failed ? null : (
					<div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-inv-rule px-6 py-12 text-center">
						<p className="max-w-[260px] text-[12px] leading-[1.7] text-inv-muted">
							{copy.empty}
						</p>
						<Ornament />
					</div>
				)}

				{cards.length ? (
					<div className="mt-10 flex justify-center">
						<Ornament />
					</div>
				) : null}
			</div>

			{active ? (
				<WallDialog card={active} onClose={() => setActive(null)} />
			) : null}

			{adminToken && pendingDelete ? (
				<WallDeleteDialog
					card={pendingDelete}
					deleteCard={(id) =>
						deleteWallCard({
							data: { id, token: adminToken ?? "" },
						})
					}
					onClose={() => setPendingDelete(null)}
					onDeleted={() => {
						setPendingDelete(null);
						void router.invalidate();
					}}
				/>
			) : null}
		</main>
	);
}
