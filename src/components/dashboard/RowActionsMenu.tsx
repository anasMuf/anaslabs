import {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

export interface RowActionItem {
	label: string;
	onSelect: () => void;
	disabled?: boolean;
	/** Accent color for destructive/negative actions. */
	tone?: "danger";
}

interface RowActionsMenuProps {
	items: RowActionItem[];
	/** Accessible name for the trigger, e.g. "Aksi untuk Budi". */
	label?: string;
	disabled?: boolean;
}

const MENU_WIDTH = 200;
const GAP = 4;
const EDGE = 8;

/**
 * Three-dot row menu.
 *
 * The popover is portalled to `<body>` and positioned `fixed`: the guest table
 * lives in an `overflow-x-auto` wrapper that would clip an absolutely
 * positioned menu. Position is measured after mount so a short row near the
 * bottom of the viewport opens upward.
 */
export default function RowActionsMenu({
	items,
	label = "Aksi",
	disabled = false,
}: RowActionsMenuProps) {
	const menuId = useId();
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState<{
		top?: number;
		bottom?: number;
		right: number;
	} | null>(null);

	const close = useCallback((restoreFocus = false) => {
		setOpen(false);
		setPos(null);
		if (restoreFocus) triggerRef.current?.focus();
	}, []);

	const openMenu = useCallback(() => {
		itemRefs.current = [];
		setOpen(true);
	}, []);

	useLayoutEffect(() => {
		if (!open) return;
		const trigger = triggerRef.current;
		const menu = menuRef.current;
		if (!trigger || !menu) return;

		const rect = trigger.getBoundingClientRect();
		const height = menu.offsetHeight;
		const right = Math.max(EDGE, window.innerWidth - rect.right);
		const below = window.innerHeight - rect.bottom - GAP;
		const above = rect.top - GAP;

		if (below < height && above > below) {
			setPos({
				bottom: Math.max(EDGE, window.innerHeight - rect.top + GAP),
				right,
			});
		} else {
			setPos({ top: rect.bottom + GAP, right });
		}
	}, [open]);

	useEffect(() => {
		if (!open) return;

		const firstEnabled = () => {
			const target = itemRefs.current.find((el) => el && !el.disabled);
			target?.focus();
		};
		firstEnabled();

		const onPointerDown = (event: MouseEvent) => {
			const target = event.target as Node;
			if (
				menuRef.current?.contains(target) ||
				triggerRef.current?.contains(target)
			) {
				return;
			}
			close();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close(true);
			}
		};
		const onViewportChange = () => close();

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("scroll", onViewportChange, true);
		window.addEventListener("resize", onViewportChange);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("scroll", onViewportChange, true);
			window.removeEventListener("resize", onViewportChange);
		};
	}, [open, close]);

	function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		const buttons = itemRefs.current.filter(
			(el): el is HTMLButtonElement => el !== null && !el.disabled,
		);
		if (!buttons.length) return;
		const current = buttons.indexOf(
			document.activeElement as HTMLButtonElement,
		);

		if (event.key === "ArrowDown") {
			event.preventDefault();
			buttons[(current + 1) % buttons.length]?.focus();
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			buttons[(current - 1 + buttons.length) % buttons.length]?.focus();
		} else if (event.key === "Home") {
			event.preventDefault();
			buttons[0]?.focus();
		} else if (event.key === "End") {
			event.preventDefault();
			buttons[buttons.length - 1]?.focus();
		} else if (event.key === "Tab") {
			close();
		}
	}

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				onClick={() => (open ? close() : openMenu())}
				className="flex h-7 w-7 items-center justify-center rounded-full border border-inv-rule font-body text-[15px] leading-none text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				<span aria-hidden="true">⋯</span>
			</button>

			{open
				? createPortal(
						<div
							ref={menuRef}
							id={menuId}
							role="menu"
							aria-label={label}
							onKeyDown={handleMenuKeyDown}
							style={{
								position: "fixed",
								width: MENU_WIDTH,
								right: pos?.right ?? EDGE,
								top: pos?.top,
								bottom: pos?.bottom,
								visibility: pos ? "visible" : "hidden",
							}}
							className="z-50 flex flex-col rounded-2xl border border-inv-rule bg-inv-card p-1 shadow-[0_18px_40px_-24px_rgba(52,54,46,0.6)]"
						>
							{items.map((item, index) => (
								<button
									key={`${item.label}-${index}`}
									ref={(el) => {
										itemRefs.current[index] = el;
									}}
									type="button"
									role="menuitem"
									disabled={item.disabled}
									onClick={() => {
										close(true);
										item.onSelect();
									}}
									className={`rounded-xl px-2.5 py-2 text-left font-body text-[11.5px] transition-colors hover:bg-inv-ink/5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent ${
										item.tone === "danger" ? "text-inv-accent" : "text-inv-ink"
									}`}
								>
									{item.label}
								</button>
							))}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
