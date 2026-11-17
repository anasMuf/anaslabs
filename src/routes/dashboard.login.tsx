import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	createDashboardSession,
	type DashboardLoginMode,
	getDashboardAuthConfig,
	getDashboardLoginMode,
	signOutDashboard,
} from "#/lib/dashboard-auth";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

export const Route = createFileRoute("/dashboard/login")({
	component: DashboardLogin,
});

/**
 * Email + password login against Supabase Auth.
 *
 * The Supabase session is used once to mint our own httpOnly cookie and then
 * dropped, so no access token lingers in browser storage. Credentials live in
 * Supabase (Authentication → Users); access is gated by `dashboard_users`.
 */
function DashboardLogin() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<DashboardLoginMode | "loading">("loading");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void getDashboardLoginMode()
			.then((result) => setMode(result.mode))
			.catch(() => setMode("none"));
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setBusy(true);

		try {
			const config = await getDashboardAuthConfig();
			if (!config) {
				setError("Supabase Auth belum dikonfigurasi di server.");
				return;
			}

			const supabase = createSupabaseBrowser(config);
			const { data, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: email.trim(),
					password,
				});

			if (signInError) {
				setError(
					signInError.message === "Invalid login credentials"
						? "Email atau password salah."
						: signInError.message,
				);
				return;
			}

			const accessToken = data.session?.access_token;
			if (!accessToken) {
				setError("Supabase tidak mengembalikan sesi. Coba lagi.");
				return;
			}

			const result = await createDashboardSession({ data: { accessToken } });
			await supabase.auth.signOut();

			if (!result.ok) {
				setError(result.error);
				return;
			}

			await navigate({ to: "/dashboard", replace: true });
		} catch {
			setError("Gagal masuk. Periksa koneksi lalu coba lagi.");
		} finally {
			setBusy(false);
		}
	}

	const inputClass =
		"w-full rounded-2xl border border-inv-rule bg-inv-card px-4 py-3 font-body text-[13px] text-inv-ink placeholder:text-inv-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";
	const labelClass =
		"font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent";

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
			<h1 className="text-center font-display text-[28px] leading-tight">
				Dashboard Undangan
			</h1>
			<p className="mt-2 text-center font-body text-[12px] leading-[1.7] text-inv-muted">
				Masuk dengan email dan password akun Anda.
			</p>

			{mode === "loading" ? (
				<p className="mt-8 text-center font-body text-[12px] text-inv-muted">
					Memuat…
				</p>
			) : null}

			{mode === "none" ? (
				<p className="mt-6 rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 text-center font-body text-[11px] leading-relaxed text-inv-accent">
					Login belum aktif: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, dan
					`DASHBOARD_SESSION_SECRET` harus ada di env server.
				</p>
			) : null}

			{mode === "supabase" ? (
				<form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
					<label htmlFor="dashboard-email" className={labelClass}>
						EMAIL
					</label>
					<input
						id="dashboard-email"
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="nama@email.com"
						className={inputClass}
					/>

					<label htmlFor="dashboard-password" className={labelClass}>
						PASSWORD
					</label>
					<input
						id="dashboard-password"
						type="password"
						required
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className={inputClass}
					/>

					{error ? (
						<p
							role="alert"
							className="rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 font-body text-[11px] leading-relaxed text-inv-accent"
						>
							{error}
						</p>
					) : null}

					<button
						type="submit"
						disabled={busy}
						className="mt-1 flex items-center justify-center rounded-full bg-inv-accent px-5 py-3.5 font-body text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy ? "Memeriksa…" : "Masuk"}
					</button>
				</form>
			) : null}

			<button
				type="button"
				onClick={async () => {
					await signOutDashboard();
					await navigate({ to: "/dashboard/login", replace: true });
				}}
				className="mt-6 self-center font-body text-[11px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				Keluar sesi di perangkat ini
			</button>
		</div>
	);
}
