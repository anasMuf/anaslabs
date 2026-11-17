import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	createDashboardPasswordSession,
	type DashboardLoginMode,
	getDashboardAuthConfig,
	getDashboardLoginMode,
	signOutDashboard,
} from "#/lib/dashboard-auth";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

export const Route = createFileRoute("/dashboard/login")({
	component: DashboardLogin,
});

type Status = "idle" | "working" | "sent";

/**
 * Two ways in, chosen by the server config: a password stored as a scrypt hash
 * (default, no email quota) or a Supabase magic link for allowlisted emails.
 */
function DashboardLogin() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<DashboardLoginMode | "loading">("loading");
	const [identity, setIdentity] = useState("Admin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void getDashboardLoginMode()
			.then((result) => {
				setMode(result.mode);
				setIdentity(result.identity);
			})
			.catch(() => setMode("none"));
	}, []);

	async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setStatus("working");

		const result = await createDashboardPasswordSession({
			data: { password },
		});

		if (!result.ok) {
			setError(result.error);
			setStatus("idle");
			return;
		}

		await navigate({ to: "/dashboard", replace: true });
	}

	async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const config = await getDashboardAuthConfig();
		if (!config) {
			setError("Supabase Auth belum dikonfigurasi di server.");
			return;
		}

		setStatus("working");
		const supabase = createSupabaseBrowser(config);
		const { error: signInError } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			options: { emailRedirectTo: `${window.location.origin}/dashboard/auth` },
		});

		if (signInError) {
			setError(signInError.message);
			setStatus("idle");
			return;
		}

		setStatus("sent");
	}

	const inputClass =
		"w-full rounded-2xl border border-inv-rule bg-inv-card px-4 py-3 font-body text-[13px] text-inv-ink placeholder:text-inv-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";
	const labelClass =
		"font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent";
	const buttonClass =
		"flex items-center justify-center rounded-full bg-inv-accent px-5 py-3.5 font-body text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
			<h1 className="text-center font-display text-[28px] leading-tight">
				Dashboard Undangan
			</h1>
			<p className="mt-2 text-center font-body text-[12px] leading-[1.7] text-inv-muted">
				{mode === "password"
					? `Masuk sebagai ${identity}.`
					: "Masuk dengan email yang terdaftar. Kami kirim tautan sekali pakai."}
			</p>

			{mode === "loading" ? (
				<p className="mt-8 text-center font-body text-[12px] text-inv-muted">
					Memuat…
				</p>
			) : null}

			{mode === "none" ? (
				<p className="mt-6 rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 text-center font-body text-[11px] leading-relaxed text-inv-accent">
					Login belum aktif. Set `DASHBOARD_PASSWORD_HASH` (atau
					`DASHBOARD_EMAILS` + Supabase) di env server.
				</p>
			) : null}

			{mode === "password" ? (
				<form onSubmit={handlePassword} className="mt-6 flex flex-col gap-3">
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
						disabled={status === "working"}
						className={buttonClass}
					>
						{status === "working" ? "Memeriksa…" : "Masuk"}
					</button>
				</form>
			) : null}

			{mode === "magic-link" ? (
				status === "sent" ? (
					<div className="mt-6 rounded-2xl border border-inv-rule bg-inv-card px-4 py-4 text-center">
						<p className="font-body text-[12px] leading-[1.7] text-inv-ink">
							Tautan masuk sudah dikirim ke{" "}
							<strong className="font-semibold">{email.trim()}</strong>.
						</p>
						<button
							type="button"
							onClick={() => setStatus("idle")}
							className="mt-3 font-body text-[11px] text-inv-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
						>
							Ganti email
						</button>
					</div>
				) : (
					<form onSubmit={handleMagicLink} className="mt-6 flex flex-col gap-3">
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
							disabled={status === "working"}
							className={buttonClass}
						>
							{status === "working" ? "Mengirim…" : "Kirim tautan masuk"}
						</button>
					</form>
				)
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
