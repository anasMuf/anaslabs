import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * Minimal toast layer.
 *
 * Messages appear above the page in a fixed stack, so reporting an error never
 * reflows the form underneath (unlike an inline alert paragraph that pushes the
 * submit button down). The provider lives in the route layout, so a toast
 * survives client-side navigation between its children.
 */

export type ToastTone = "error" | "success" | "info";

export interface ToastInput {
	message: string;
	tone?: ToastTone;
	/** Milliseconds on screen; 0 keeps it until dismissed. */
	duration?: number;
}

type PushToast = (input: ToastInput) => void;

interface ToastItem {
	id: number;
	message: string;
	tone: ToastTone;
	duration: number;
}

const ToastContext = createContext<PushToast | null>(null);

const DOT_CLASS: Record<ToastTone, string> = {
	error: "bg-inv-accent",
	success: "bg-inv-ink/55",
	info: "bg-inv-muted/60",
};

const BORDER_CLASS: Record<ToastTone, string> = {
	error: "border-inv-accent/40",
	success: "border-inv-rule",
	info: "border-inv-rule",
};

const DEFAULT_DURATION: Record<ToastTone, number> = {
	error: 7000,
	success: 4000,
	info: 4500,
};

/** Keeps the stack short on phones so it cannot cover the whole screen. */
const MAX_VISIBLE = 3;

export function useToast(): PushToast {
	const push = useContext(ToastContext);
	if (!push) {
		throw new Error("useToast harus dipakai di dalam <ToastProvider>.");
	}
	return push;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const [mounted, setMounted] = useState(false);
	const nextId = useRef(1);
	const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

	// The stack is portalled to <body> so a transformed/zoomed ancestor cannot
	// turn `position: fixed` into a page-relative box.
	useEffect(() => setMounted(true), []);

	const dismiss = useCallback((id: number) => {
		const timer = timers.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timers.current.delete(id);
		}
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const push = useCallback<PushToast>(
		({ message, tone = "error", duration }) => {
			const text = message.trim();
			if (!text) return;

			const id = nextId.current++;
			const item: ToastItem = {
				id,
				message: text,
				tone,
				duration: duration ?? DEFAULT_DURATION[tone],
			};

			setToasts((current) => {
				// Repeating the same failure should refresh the toast, not stack it.
				const deduped = current.filter((toast) => toast.message !== text);
				const trimmed = deduped.slice(-(MAX_VISIBLE - 1));
				for (const dropped of deduped.slice(
					0,
					deduped.length - trimmed.length,
				)) {
					const timer = timers.current.get(dropped.id);
					if (timer) clearTimeout(timer);
					timers.current.delete(dropped.id);
				}
				return [...trimmed, item];
			});

			if (item.duration > 0) {
				timers.current.set(
					id,
					setTimeout(() => dismiss(id), item.duration),
				);
			}
		},
		[dismiss],
	);

	const value = useMemo(() => push, [push]);

	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const timer of pending.values()) clearTimeout(timer);
			pending.clear();
		};
	}, []);

	return (
		<ToastContext.Provider value={value}>
			{children}
			{mounted
				? createPortal(
						<section
							aria-label="Notifikasi"
							className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
						>
							{toasts.map((toast) => (
								<div
									key={toast.id}
									role={toast.tone === "error" ? "alert" : "status"}
									aria-live={toast.tone === "error" ? "assertive" : "polite"}
									className={`toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-inv-card px-4 py-3 text-inv-ink shadow-[0_18px_40px_-28px_rgba(52,54,46,0.6)] ${BORDER_CLASS[toast.tone]}`}
								>
									<span
										aria-hidden="true"
										className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[toast.tone]}`}
									/>
									<p className="flex-1 font-body text-[11.5px] leading-relaxed">
										{toast.message}
									</p>
									<button
										type="button"
										onClick={() => dismiss(toast.id)}
										aria-label="Tutup notifikasi"
										className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-body text-[14px] leading-none text-inv-muted transition-colors hover:bg-inv-ink/5 hover:text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
									>
										×
									</button>
								</div>
							))}
						</section>,
						document.body,
					)
				: null}
		</ToastContext.Provider>
	);
}
