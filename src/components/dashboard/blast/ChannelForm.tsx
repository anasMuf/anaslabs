import { useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	saveBlastChannel,
	setBlastChannelEnabled,
	testBlastChannel,
} from "#/lib/blast/channels";
import type { BlastChannelView } from "#/lib/blast/types";

interface Props {
	channel: BlastChannelView;
	onUpdated: (channel: BlastChannelView) => void;
}

const inputClass =
	"w-full rounded-2xl border border-inv-rule bg-inv-bg px-4 py-2.5 font-body text-[11px] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";

const labelClass =
	"font-body text-[10px] font-semibold tracking-[0.14em] text-inv-muted";

export function ChannelForm({ channel, onUpdated }: Props) {
	const toast = useToast();
	const [baseUrl, setBaseUrl] = useState(channel.baseUrl);
	const [token, setToken] = useState("");
	const [secretKey, setSecretKey] = useState("");
	const [senderPhone, setSenderPhone] = useState(channel.senderPhone ?? "");
	const [busy, setBusy] = useState<"save" | "test" | "toggle" | null>(null);

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		setBusy("save");
		try {
			const result = await saveBlastChannel({
				data: {
					source: channel.source,
					baseUrl,
					token,
					secretKey,
					senderPhone,
				},
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			onUpdated(result.channel);
			setToken("");
			setSecretKey("");
			toast({
				tone: "success",
				message: `Kanal ${result.channel.label} tersambung${result.channel.status ? ` (${result.channel.status})` : ""}.`,
			});
		} catch {
			toast({
				message: "Gagal menyimpan kanal. Periksa koneksi lalu coba lagi.",
			});
		} finally {
			setBusy(null);
		}
	}

	async function handleTest() {
		setBusy("test");
		try {
			const result = await testBlastChannel({
				data: { source: channel.source },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			onUpdated(result.channel);
			toast({
				tone: "success",
				message: `Uji koneksi ${result.channel.label}: ${result.channel.status ?? "tidak diketahui"}${result.channel.quota !== null ? `, kuota ${result.channel.quota}` : ""}.`,
			});
		} catch {
			toast({ message: "Gagal menguji koneksi." });
		} finally {
			setBusy(null);
		}
	}

	async function handleToggle() {
		setBusy("toggle");
		try {
			const result = await setBlastChannelEnabled({
				data: { source: channel.source, enabled: !channel.enabled },
			});
			if (!result.ok) {
				toast({ message: result.error });
				return;
			}
			onUpdated(result.channel);
		} catch {
			toast({ message: "Gagal mengubah status kanal." });
		} finally {
			setBusy(null);
		}
	}

	const connected = channel.status === "connected" && channel.enabled;

	return (
		<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h2 className="font-display text-[18px] leading-tight">
						Nomor {channel.label}
					</h2>
					<p className="mt-1 font-body text-[11px] leading-relaxed text-inv-muted">
						{channel.configured
							? `Device ${channel.deviceId ?? "—"} · token ${channel.tokenHint ?? "tidak terbaca"}`
							: "Belum ada kredensial tersimpan."}
					</p>
				</div>
				<span
					className={`rounded-full border px-3 py-1 font-body text-[10px] tracking-[0.08em] ${
						connected
							? "border-inv-ink/25 text-inv-ink"
							: "border-inv-rule text-inv-muted"
					}`}
				>
					{channel.configured
						? channel.enabled
							? (channel.status ?? "belum diuji")
							: "nonaktif"
						: "belum diset"}
				</span>
			</div>

			{channel.needsReentry ? (
				<p className="mt-3 rounded-2xl border border-inv-accent/40 bg-inv-accent/5 px-3 py-2 font-body text-[11px] leading-relaxed text-inv-ink">
					Kredensial tersimpan tidak bisa dibaca (kunci sesi berubah). Isi ulang
					token dan secret key di bawah.
				</p>
			) : null}

			<div className="mt-3 grid gap-2 font-body text-[11px] text-inv-muted sm:grid-cols-3">
				<p>Kuota: {channel.quota ?? "—"}</p>
				<p>Kedaluwarsa: {channel.expiresOn ?? "—"}</p>
				<p>
					Terakhir diuji:{" "}
					{channel.lastCheckedAt
						? new Intl.DateTimeFormat("id-ID", {
								dateStyle: "medium",
								timeStyle: "short",
								timeZone: "Asia/Jakarta",
							}).format(new Date(channel.lastCheckedAt))
						: "—"}
				</p>
			</div>

			<form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
				<label className="flex flex-col gap-1">
					<span className={labelClass}>SERVER WABLAS</span>
					<input
						type="url"
						value={baseUrl}
						onChange={(event) => setBaseUrl(event.target.value)}
						placeholder="https://jogja.wablas.com"
						className={inputClass}
						required
					/>
				</label>

				<div className="grid gap-3 sm:grid-cols-2">
					<label className="flex flex-col gap-1">
						<span className={labelClass}>TOKEN</span>
						<input
							type="password"
							value={token}
							onChange={(event) => setToken(event.target.value)}
							placeholder={
								channel.configured
									? "Kosongkan untuk mempertahankan token lama"
									: "Token device Wablas"
							}
							autoComplete="off"
							className={inputClass}
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span className={labelClass}>SECRET KEY</span>
						<input
							type="password"
							value={secretKey}
							onChange={(event) => setSecretKey(event.target.value)}
							placeholder={
								channel.configured
									? "Kosongkan untuk mempertahankan secret lama"
									: "Secret key device"
							}
							autoComplete="off"
							className={inputClass}
						/>
					</label>
				</div>

				<label className="flex flex-col gap-1">
					<span className={labelClass}>NOMOR PENGIRIM (OPSIONAL)</span>
					<input
						type="tel"
						value={senderPhone}
						onChange={(event) => setSenderPhone(event.target.value)}
						placeholder="08xx…"
						className={inputClass}
					/>
				</label>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						disabled={busy !== null}
						className="rounded-full bg-inv-accent px-4 py-2.5 font-body text-[11px] font-semibold text-inv-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "save" ? "Menghubungkan…" : "Simpan & uji"}
					</button>
					<button
						type="button"
						onClick={() => void handleTest()}
						disabled={busy !== null || !channel.configured}
						className="rounded-full border border-inv-ink/25 px-4 py-2.5 font-body text-[11px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{busy === "test" ? "Menguji…" : "Uji koneksi"}
					</button>
					<button
						type="button"
						onClick={() => void handleToggle()}
						disabled={busy !== null || !channel.configured}
						className="rounded-full border border-inv-rule px-4 py-2.5 font-body text-[11px] text-inv-muted transition-colors hover:bg-inv-ink/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
					>
						{channel.enabled ? "Nonaktifkan" : "Aktifkan"}
					</button>
				</div>
			</form>
		</section>
	);
}
