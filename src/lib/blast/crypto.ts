import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

/**
 * Enkripsi kredensial Wablas (token + secret key).
 *
 * Kunci diturunkan dari `DASHBOARD_SESSION_SECRET`, bukan disimpan terpisah:
 * satu rahasia lingkungan sudah cukup untuk sesi dashboard dan kredensial blast.
 * Konsekuensinya, merotasi env itu membuat ciphertext lama tidak terbaca — UI
 * harus menampilkan "isi ulang kredensial", bukan crash.
 *
 * Format: `v1:<iv base64>:<tag base64>:<cipher base64>`.
 */

const VERSION = "v1";
const IV_BYTES = 12;
const MIN_SECRET_LENGTH = 16;

export class CredentialCipherError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CredentialCipherError";
	}
}

function deriveKey(sessionSecret: string): Buffer {
	if (!sessionSecret || sessionSecret.length < MIN_SECRET_LENGTH) {
		throw new CredentialCipherError(
			"DASHBOARD_SESSION_SECRET belum diset (minimal 16 karakter).",
		);
	}

	return createHash("sha256").update(`${sessionSecret}:blast-v1`).digest();
}

export function encryptSecret(plain: string, sessionSecret: string): string {
	const value = plain.trim();
	if (!value) throw new CredentialCipherError("Nilai yang dienkripsi kosong.");

	const key = deriveKey(sessionSecret);
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return [
		VERSION,
		iv.toString("base64"),
		tag.toString("base64"),
		encrypted.toString("base64"),
	].join(":");
}

export function decryptSecret(
	ciphertext: string,
	sessionSecret: string,
): string {
	const parts = String(ciphertext ?? "").split(":");
	if (parts.length !== 4 || parts[0] !== VERSION) {
		throw new CredentialCipherError("Format kredensial tidak dikenal.");
	}

	const [, ivPart, tagPart, dataPart] = parts;
	try {
		const key = deriveKey(sessionSecret);
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key,
			Buffer.from(ivPart, "base64"),
		);
		decipher.setAuthTag(Buffer.from(tagPart, "base64"));
		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(dataPart, "base64")),
			decipher.final(),
		]);
		return decrypted.toString("utf8");
	} catch {
		// Jangan bocorkan detail kripto ke pemanggil; yang penting tindakannya.
		throw new CredentialCipherError(
			"Kredensial tidak bisa dibaca. Isi ulang token di halaman setup.",
		);
	}
}

/** Hanya 4 karakter terakhir yang boleh terlihat di UI. */
export function maskSecret(plain: string): string {
	const value = String(plain ?? "").trim();
	if (value.length <= 4) return "••••";
	return `••••${value.slice(-4)}`;
}
