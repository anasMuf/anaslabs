import { describe, expect, it } from "vitest";
import {
	CredentialCipherError,
	decryptSecret,
	encryptSecret,
	maskSecret,
} from "./crypto";

const SECRET = "0123456789abcdef0123456789abcdef";

describe("blast crypto", () => {
	it("round-trips a credential", () => {
		const cipher = encryptSecret("token-rahasia", SECRET);
		expect(cipher.startsWith("v1:")).toBe(true);
		expect(cipher).not.toContain("token-rahasia");
		expect(decryptSecret(cipher, SECRET)).toBe("token-rahasia");
	});

	it("produces a different ciphertext each time", () => {
		const first = encryptSecret("sama", SECRET);
		const second = encryptSecret("sama", SECRET);
		expect(first).not.toBe(second);
	});

	it("rejects a tampered ciphertext", () => {
		const cipher = encryptSecret("token", SECRET);
		const parts = cipher.split(":");
		parts[3] = Buffer.from("diubah").toString("base64");

		expect(() => decryptSecret(parts.join(":"), SECRET)).toThrow(
			CredentialCipherError,
		);
	});

	it("rejects a different session secret", () => {
		const cipher = encryptSecret("token", SECRET);
		expect(() => decryptSecret(cipher, `${SECRET}-lain`)).toThrow(
			CredentialCipherError,
		);
	});

	it("rejects an unknown format", () => {
		expect(() => decryptSecret("plain-text", SECRET)).toThrow(
			CredentialCipherError,
		);
	});

	it("requires a long enough session secret", () => {
		expect(() => encryptSecret("token", "pendek")).toThrow(
			CredentialCipherError,
		);
	});

	it("masks all but the last four characters", () => {
		expect(maskSecret("abcdefgh")).toBe("••••efgh");
		expect(maskSecret("abc")).toBe("••••");
	});
});
