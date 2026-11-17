import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboardAuthConfig, signOutDashboard } from "#/lib/dashboard-auth";
import { createSupabaseBrowser } from "#/lib/supabase-browser";

export const Route = createFileRoute("/dashboard/login")({
	component: DashboardLogin,
});

function DashboardLogin() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
	const [error, setError] = useState<string | null>(null);
	const [configured, setConfigured] = useState<boolean | null>(null);

	// The publishable key is served at runtime, so the page also works for builds
	// produced in CI where no `.env` exists.
	useEffect(() => {
		void getDashboardAuthConfig()
			.then((config) => setConfigured(Boolean(config)))
			.catch(() => setConfigured(false));
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const config = await getDashboardAuthConfig();
		if (!config) {
			setError(
				"Supabase Auth belum dikonfigurasi di server (SUPABASE_PUBLISHABLE_KEY).",
			);
			return;
		}

		setStatus("sending");
		const supabase = createSupabaseBrowser(config);
		const { error: signInError } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			options: {
				emailRedirectTo: `${window.location.origin}/dashboard/auth`,
			},
		});

		if (signInError) {
			setError(signInError.message);
			setStatus("idle");
			return;
		}

		setStatus("sent");
	}

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
			<h1 className="text-center font-display text-[28px] leading-tight">
				Dashboard Undangan
			</h1>
			<p className="mt-2 text-center font-body text-[12px] leading-[1.7] text-inv-muted">
				Masuk dengan email yang terdaftar. Kami kirim tautan sekali pakai, tanpa
				password.
			</p>

			{configured === false ? (
				<p className="mt-4 rounded-2xl border border-inv-accent/30 bg-inv-card px-4 py-3 text-center font-body text-[11px] leading-relaxed text-inv-accent">
					Login belum aktif: `SUPABASE_PUBLISHABLE_KEY` belum diset di server.
				</p>
			) : null}

			{status === "sent" ? (
				<div className="mt-6 rounded-2xl border border-inv-rule bg-inv-card px-4 py-4 text-center">
					<p className="font-body text-[12px] leading-[1.7] text-inv-ink">
						Tautan masuk sudah dikirim ke{" "}
						<strong className="font-semibold">{email.trim()}</strong>.
					</p>
					<p className="mt-1 font-body text-[11px] leading-[1.6] text-inv-muted">
						Buka email di perangkat ini (tautan berlaku 1 jam).
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
				<form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
					<label
						htmlFor="dashboard-email"
						className="font-body text-[10px] font-semibold tracking-[0.16em] text-inv-accent"
					>
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
						className="w-full rounded-2xl border border-inv-rule bg-inv-card px-4 py-3 font-body text-[13px] text-inv-ink placeholder:text-inv-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
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
						disabled={status === "sending"}
						className="flex items-center justify-center rounded-full bg-inv-accent px-5 py-3.5 font-body text-[12px] font-semibold tracking-[0.08em] text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{status === "sending" ? "Mengirim…" : "Kirim tautan masuk"}
					</button>
				</form>
			)}

			<button
				type="button"
				onClick={async () => {
					await signOutDashboard();
					await navigate({ to: "/dashboard/login", replace: true });
				}}
				className="mt-6 self-center font-body text-[11px] text-inv-muted underline-offset-2 hover:text-inv-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
			>
				Sudah masuk di perangkat lain? Keluar sesi ini
			</button>
		</div>
	);
}
