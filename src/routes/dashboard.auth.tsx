import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
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
 *
 * Password login is the normal path; this exists in case a recovery/magic link
 * is ever sent from the Supabase dashboard. Any failure is shown as a toast and
 * the visitor is returned to the login form.
 */
function DashboardAuthCallback() {
	const navigate = useNavigate();
	const toast = useToast();
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		void (async () => {
			const fail = async (message: string) => {
				toast({ message });
				await navigate({ to: "/dashboard/login", replace: true });
			};

			const config = await getDashboardAuthConfig();
			if (!config) {
				await fail("Supabase Auth belum dikonfigurasi di server.");
				return;
			}
			const supabase = createSupabaseBrowser(config);

			// PKCE links arrive as `?code=`, implicit links as a URL hash; support both.
			const code = new URLSearchParams(window.location.search).get("code");
			if (code) {
				const { error: exchangeError } =
					await supabase.auth.exchangeCodeForSession(code);
				if (exchangeError) {
					await fail(exchangeError.message);
					return;
				}
			}

			const { data } = await supabase.auth.getSession();
			const accessToken = data.session?.access_token;
			if (!accessToken) {
				await fail(
					"Tautan tidak valid atau sudah dipakai. Minta tautan baru dari halaman masuk.",
				);
				return;
			}

			const result = await createDashboardSession({ data: { accessToken } });
			await supabase.auth.signOut();

			if (!result.ok) {
				await fail(result.error);
				return;
			}

			await navigate({ to: "/dashboard", replace: true });
		})();
	}, [navigate, toast]);

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10 text-center">
			<h1 className="font-display text-[24px] leading-tight">
				Memeriksa tautan…
			</h1>
			<p className="mt-2 font-body text-[12px] text-inv-muted">
				Sebentar, kami sedang membuat sesi untuk Anda.
			</p>
		</div>
	);
}
