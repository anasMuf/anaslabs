/**
 * Route-loading indicator for the dashboard.
 *
 * The dashboard loaders hit Supabase before a page can render; this fills the
 * content area so navigation never looks frozen. Kept out of the public site by
 * the guard in `router.tsx`.
 */
export default function DashboardPending() {
	return (
		<output
			aria-live="polite"
			className="flex flex-col items-center justify-center gap-3 py-16"
		>
			<span
				aria-hidden="true"
				className="h-7 w-7 animate-spin rounded-full border-2 border-inv-rule border-t-inv-accent motion-reduce:animate-none"
			/>
			<p className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-muted">
				MEMUAT…
			</p>
		</output>
	);
}
