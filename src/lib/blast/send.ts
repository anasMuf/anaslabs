import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { readDashboardUser } from "../dashboard-session-server";
import type { GuestSource } from "../guest-import";
import { getSupabaseAdmin } from "../supabase-admin";
import { effectiveBlastChannel } from "./attribution";
import { readChannelCredentials } from "./channel-server";
import { renderTemplate, TEMPLATE_MAX_LENGTH } from "./template";
import { readTemplateBody } from "./template-server";
import { sendMessages, WablasError } from "./wablas";

/**
 * Kirim satu undangan langsung (tanpa antrian).
 *
 * `dryRun` merender pesan tanpa memanggil Wablas, dipakai untuk pratinjau.
 * `guests.sent_at` hanya diisi setelah Wablas menerima pesan.
 */

interface GuestRow {
	id: string;
	name: string;
	slug: string;
	group_name: string | null;
	address: string | null;
	invited: string | null;
	source_sheet: GuestSource;
	delivery: "digital" | "fisik";
	phone: string | null;
	sent_at: string | null;
	archived_at: string | null;
	blast_channel: GuestSource | null;
}

export type SendSingleResult =
	| {
			ok: true;
			dryRun: boolean;
			message: string;
			phone: string;
			channel: GuestSource;
	  }
	| { ok: false; error: string };

function errorMessage(error: unknown): string {
	if (error instanceof WablasError) return error.message;
	if (error instanceof Error && error.message) return error.message;
	return "Gagal mengirim pesan.";
}

export const sendSingleInvitation = createServerFn({ method: "POST" })
	.inputValidator((data: { guestId?: string; dryRun?: boolean }) => ({
		guestId: String(data?.guestId ?? "")
			.trim()
			.slice(0, 64),
		dryRun: Boolean(data?.dryRun),
	}))
	.handler(async ({ data }): Promise<SendSingleResult> => {
		const user = await readDashboardUser();
		if (!user) {
			return {
				ok: false,
				error: "Sesi dashboard tidak valid. Silakan masuk ulang.",
			};
		}
		if (!data.guestId) return { ok: false, error: "Tamu tidak dikenal." };

		const supabase = getSupabaseAdmin();
		const { data: rawGuest, error: guestError } = await supabase
			.from("guests")
			.select(
				"id, name, slug, group_name, address, invited, source_sheet, delivery, phone, sent_at, archived_at, blast_channel",
			)
			.eq("id", data.guestId)
			.maybeSingle();

		if (guestError) return { ok: false, error: guestError.message };
		const guest = rawGuest as GuestRow | null;
		if (!guest) return { ok: false, error: "Tamu tidak ditemukan." };
		if (guest.archived_at) {
			return { ok: false, error: "Tamu sudah diarsipkan." };
		}
		if (guest.delivery !== "digital") {
			return {
				ok: false,
				error: "Undangan fisik tidak dikirim lewat WhatsApp.",
			};
		}
		if (!guest.phone) {
			return { ok: false, error: "Tamu ini belum punya nomor HP." };
		}

		const channel = effectiveBlastChannel({
			source: guest.source_sheet,
			blastChannel: guest.blast_channel,
		});

		let credentials: Awaited<ReturnType<typeof readChannelCredentials>>;
		try {
			credentials = await readChannelCredentials(channel);
		} catch (error) {
			return { ok: false, error: errorMessage(error) };
		}
		if (!credentials) {
			return {
				ok: false,
				error: "Kredensial kanal ini belum diisi. Buka Setup nomor dulu.",
			};
		}
		if (!credentials.enabled) {
			return { ok: false, error: "Kanal pengirim ini sedang dinonaktifkan." };
		}

		const body = await readTemplateBody(channel);
		const message = renderTemplate(body, {
			name: guest.name,
			groupName: guest.group_name,
			address: guest.address,
			invited: guest.invited,
			slug: guest.slug,
		});
		if (message.length > TEMPLATE_MAX_LENGTH) {
			return {
				ok: false,
				error: `Pesan ${message.length} karakter; maksimal ${TEMPLATE_MAX_LENGTH}. Ringkas template.`,
			};
		}

		if (data.dryRun) {
			return {
				ok: true,
				dryRun: true,
				message,
				phone: guest.phone,
				channel,
			};
		}

		const now = new Date().toISOString();
		const refId = randomUUID();
		const { error: logError } = await supabase.from("wa_sends").insert({
			guest_id: guest.id,
			source: channel,
			phone: guest.phone,
			message,
			ref_id: refId,
			status: "sending",
			attempts: 1,
			available_at: now,
			queued_at: now,
			updated_at: now,
		});

		if (logError) {
			return {
				ok: false,
				error:
					logError.code === "23505"
						? "Tamu ini masih punya antrian aktif."
						: logError.message,
			};
		}

		let results: Awaited<ReturnType<typeof sendMessages>>;
		try {
			results = await sendMessages(credentials, [
				{ phone: guest.phone, message, refId },
			]);
		} catch (error) {
			const reason = errorMessage(error).slice(0, 300);
			const sentAt = new Date().toISOString();
			await supabase
				.from("wa_sends")
				.update({ status: "failed", error: reason, updated_at: sentAt })
				.eq("ref_id", refId);
			return { ok: false, error: reason };
		}

		const match = results.find((result) => result.refId === refId);
		if (!match) {
			const sentAt = new Date().toISOString();
			await supabase
				.from("wa_sends")
				.update({
					status: "failed",
					error: "Wablas tidak mengembalikan status untuk pesan ini.",
					updated_at: sentAt,
				})
				.eq("ref_id", refId);
			return {
				ok: false,
				error: "Wablas tidak mengembalikan status untuk pesan ini.",
			};
		}

		const sentAt = new Date().toISOString();
		await supabase
			.from("wa_sends")
			.update({
				status: "sent",
				wablas_message_id: match.messageId,
				sent_at: sentAt,
				updated_at: sentAt,
			})
			.eq("ref_id", refId);

		if (!guest.sent_at) {
			await supabase
				.from("guests")
				.update({ sent_at: sentAt, updated_at: sentAt })
				.eq("id", guest.id);
		}

		return {
			ok: true,
			dryRun: false,
			message,
			phone: guest.phone,
			channel,
		};
	});
