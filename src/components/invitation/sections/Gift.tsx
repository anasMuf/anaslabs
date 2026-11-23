import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { InvitationGiftAccount } from "#/data/invitation";
import { getGiftAccountNumber } from "#/lib/gift";
import {
	useInvitationContent,
	useInvitationPreview,
} from "../InvitationContentProvider";
import BankLogo from "../ui/BankLogo";
import CopyButton from "../ui/CopyButton";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** How long the number stays visible without any interaction. */
const REVEAL_TIMEOUT_MS = 10_000;
/** Keep in sync with the flip's `duration-[600ms]`. */
const FLIP_MS = 600;

type RevealState = "idle" | "loading" | "ready" | "error";

/**
 * Gift section (Figma 384:2909): each bank is a sealed card.
 *
 * The number is not part of the invitation data any more: it is fetched from a
 * server function only after the card is flipped, and the card flips back by
 * itself after ten seconds without interaction.
 */
export default function Gift({ gifts }: { gifts: InvitationGiftAccount[] }) {
	const { sections, giftThanks } = useInvitationContent();

	return (
		<section
			id="hadiah"
			className="invite-section snap-start flex h-dvh flex-col overflow-y-auto no-scrollbar bg-inv-bg px-8 py-8 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.gift.heading}
					intro={sections.gift.intro}
				/>

				<div className="mt-6 flex w-full flex-col items-center">
					{gifts.map((account, index) => (
						<Fragment key={account.bankName}>
							{index > 0 ? <Ornament className="my-4" /> : null}
							<GiftAccount {...account} />
						</Fragment>
					))}
				</div>

				<div className="mt-6 flex flex-col items-center gap-4">
					<p className="text-center text-[13px] font-body leading-[1.7] text-inv-muted">
						{giftThanks}
					</p>
					<Ornament />
				</div>
			</Reveal>
		</section>
	);
}

function GiftAccount({
	method,
	bankName,
	accountHolder,
}: InvitationGiftAccount) {
	const preview = useInvitationPreview();
	const backId = useId();
	const cardRef = useRef<HTMLDivElement | null>(null);
	const frontRef = useRef<HTMLButtonElement | null>(null);
	const backRef = useRef<HTMLDivElement | null>(null);
	const restoreFocusRef = useRef(false);

	const [open, setOpen] = useState(false);
	const [state, setState] = useState<RevealState>("idle");
	const [accountNumber, setAccountNumber] = useState<string | null>(null);
	// Bumped on every tap/key while open, so the idle countdown restarts.
	const [activity, setActivity] = useState(0);

	const load = async () => {
		setState("loading");

		try {
			const number = await getGiftAccountNumber({ data: { bankName } });
			if (number) {
				setAccountNumber(number);
				setState("ready");
			} else {
				setState("error");
			}
		} catch {
			setState("error");
		}
	};

	const reveal = () => {
		setOpen(true);
		if (preview) return;
		if (state === "idle" || state === "error") void load();
	};

	// Focus follows the face that is actually visible; `inert` on the other one
	// keeps Tab and screen readers on the current side.
	useEffect(() => {
		if (open) {
			backRef.current?.focus({ preventScroll: true });
			return;
		}

		if (restoreFocusRef.current) {
			restoreFocusRef.current = false;
			frontRef.current?.focus({ preventScroll: true });
		}
	}, [open]);

	// Flip back on its own when the guest stops interacting with the card.
	// `activity` is not read in the body: changing it re-arms the timeout below.
	// biome-ignore lint/correctness/useExhaustiveDependencies: activity restarts the idle timer
	useEffect(() => {
		if (!open || state === "idle") return;

		const timer = window.setTimeout(() => {
			restoreFocusRef.current = Boolean(
				backRef.current?.contains(document.activeElement),
			);
			setOpen(false);
		}, REVEAL_TIMEOUT_MS);

		return () => window.clearTimeout(timer);
	}, [open, state, activity]);

	// Any tap or key press inside the open card restarts the countdown.
	useEffect(() => {
		const node = cardRef.current;
		if (!open || !node) return;

		const restart = () => setActivity((value) => value + 1);
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				restoreFocusRef.current = Boolean(
					backRef.current?.contains(document.activeElement),
				);
				setOpen(false);
				return;
			}
			restart();
		};

		node.addEventListener("pointerdown", restart);
		node.addEventListener("keydown", handleKey);

		return () => {
			node.removeEventListener("pointerdown", restart);
			node.removeEventListener("keydown", handleKey);
		};
	}, [open]);

	// In the preview there is no number to fetch, so flip back on a short timer
	// instead of waiting for an interaction that never comes.
	useEffect(() => {
		if (!preview || !open) return;
		const timer = window.setTimeout(() => setOpen(false), 5000);
		return () => window.clearTimeout(timer);
	}, [preview, open]);

	// Drop the number from the DOM once the flip-back animation is over.
	useEffect(() => {
		if (open || !accountNumber) return;

		const timer = window.setTimeout(() => {
			setAccountNumber(null);
			setState("idle");
			setActivity(0);
		}, FLIP_MS + 60);

		return () => window.clearTimeout(timer);
	}, [open, accountNumber]);

	return (
		<div ref={cardRef} className="w-full [perspective:1200px]">
			<div
				className="relative grid transition-transform duration-[600ms] ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
				style={{ transform: open ? "rotateY(180deg)" : "rotateY(0deg)" }}
			>
				<button
					ref={frontRef}
					type="button"
					inert={open}
					aria-expanded={open}
					aria-controls={backId}
					onClick={reveal}
					className="flex min-h-[196px] w-full flex-col items-center justify-center rounded-[18px] border border-inv-rule bg-inv-card px-6 py-5 text-center shadow-[0_16px_38px_-30px_rgba(52,54,46,0.5)] transition-colors [backface-visibility:hidden] [grid-area:1/1] hover:border-inv-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
				>
					<p className="font-display text-[clamp(19px,5.6vw,23px)] leading-[1.35] text-inv-ink">
						{accountHolder}
					</p>

					<span className="mt-5 text-[10px] font-body uppercase leading-[1.4] tracking-[0.16em] text-inv-accent">
						Ketuk untuk lihat
					</span>
				</button>

				<div
					id={backId}
					ref={backRef}
					tabIndex={-1}
					inert={!open}
					className="flex min-h-[196px] w-full flex-col items-center justify-center rounded-[18px] border border-inv-rule bg-inv-card px-6 py-5 text-center shadow-[0_16px_38px_-30px_rgba(52,54,46,0.5)] [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)] focus:outline-none"
				>
					<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-accent">
						{method}
					</p>

					<div className="mt-2.5">
						<BankLogo bankName={bankName} />
					</div>

					<p className="mt-3 text-[11px] font-body leading-[1.5] text-inv-muted">
						Nomor rekening
					</p>

					<div
						aria-live="polite"
						className="mt-1.5 flex min-h-[26px] items-center justify-center"
					>
						{preview ? (
							<span className="text-[12px] font-body leading-[1.6] text-inv-muted">
								Tidak ditampilkan di pratinjau
							</span>
						) : state === "ready" && accountNumber ? (
							<span className="text-[15px] font-body leading-[1.6] tracking-[0.08em] text-inv-ink tabular-nums">
								{accountNumber}
							</span>
						) : state === "error" ? (
							<span className="text-[12px] font-body leading-[1.6] text-inv-muted">
								Gagal memuat
							</span>
						) : state === "loading" ? (
							<span className="text-[12px] font-body leading-[1.6] text-inv-muted">
								Memuat nomor…
							</span>
						) : (
							<span aria-hidden="true" className="text-[12px]">
								&nbsp;
							</span>
						)}
					</div>

					<p className="mt-1 text-[11px] font-body leading-[1.5] text-inv-muted">
						{accountHolder}
					</p>

					<div className="mt-3 flex min-h-[26px] items-center justify-center">
						{preview ? null : state === "ready" && accountNumber ? (
							<CopyButton value={accountNumber} />
						) : state === "error" ? (
							<button
								type="button"
								onClick={() => void load()}
								className="rounded-[20px] border border-inv-rule px-3.5 py-[5px] font-body text-[10px] uppercase tracking-[0.06em] text-inv-accent transition-colors hover:bg-inv-accent hover:text-inv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
							>
								Coba lagi
							</button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
