import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
	createDashboardSession,
	getDashboardAuthConfig,
} from "#/lib/dashboard-auth";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

export const Route = createFileRoute("/dashboard/auth")({
	component: DashboardAuthCallback,
});

/**
 * Magic-link landings: exchange the Supabase session for our own cookie, then
 * drop the Supabase session so no access token stays in browser storage.
 */
function DashboardAuthCallback() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		void (async () => {
			const config = await getDashboardAuthConfig();
			if (!config) {
				setError("Supabase Auth belum dikonfigurasi di server.");
				return;
			}
			const supabase = createSupabaseBrowser(config);

			// PKCE links arrive as `?code=`, implicit links as a URL hash; support both.
			const code = new URLSearchParams(window.location.search).get("code");
			if (code) {
				const { error: exchangeError } =
					await supabase.auth.exchangeCodeForSession(code);
				if (exchangeError) {
					setError(exchangeError.message);
					return;
				}
			}

			const { data } = await supabase.auth.getSession();
			const accessToken = data.session?.access_token;
			if (!accessToken) {
				setError(
					"Tautan tidak valid atau sudah dipakai. Minta tautan baru dari halaman masuk.",
				);
				return;
			}

			const result = await createDashboardSession({ data: { accessToken } });
			await supabase.auth.signOut();

			if (!result.ok) {
				setError(result.error);
				return;
			}

			await navigate({ to: "/dashboard", replace: true });
		})();
	}, [navigate]);

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10 text-center">
			{error ? (
				<>
					<h1 className="font-display text-[24px] leading-tight">
						Gagal masuk
					</h1>
					<p
						role="alert"
						className="mt-3 rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 font-body text-[12px] leading-relaxed text-inv-accent"
					>
						{error}
					</p>
					<button
						type="button"
						onClick={() => void navigate({ to: "/dashboard/login" })}
						className="mx-auto mt-6 inline-flex min-h-[44px] items-center rounded-full border border-inv-ink/25 px-5 font-body text-[12px] transition-colors hover:bg-inv-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						Kembali ke halaman masuk
					</button>
				</>
			) : (
				<>
					<h1 className="font-display text-[24px] leading-tight">
						Memeriksa tautan…
					</h1>
					<p className="mt-2 font-body text-[12px] text-inv-muted">
						Sebentar, kami sedang membuat sesi untuk Anda.
					</p>
				</>
			)}
		</div>
	);
}
