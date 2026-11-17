import {
	createHash,
	randomBytes,
	scryptSync,
	timingSafeEqual,
} from "node:crypto";

/**
 * Password hashing for the dashboard login.
 *
 * `scrypt` is in Node's standard library, so there is no dependency and no
 * service to keep alive. The stored format is self-describing
 * (`scrypt:N:r:p:salt:hash`), so parameters can be raised later without
 * invalidating existing hashes.
 *
 * Separator is `:` and never `$`: Vite expands `$name` inside `.env` values via
 * dotenv-expand, so a `$`-separated hash silently arrives corrupted.
 */

const PREFIX = "scrypt";
const KEY_LENGTH = 64;
const DEFAULTS = { n: 16384, r: 8, p: 1 };

type Params = typeof DEFAULTS;

function derive(password: string, salt: Buffer, params: Params): Buffer {
	return scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
		N: params.n,
		r: params.r,
		p: params.p,
		// scrypt memory limit must cover 128 * N * r
		maxmem: 128 * params.n * params.r * 2,
	});
}

export function hashDashboardPassword(
	password: string,
	params: Params = DEFAULTS,
	salt: Buffer = randomBytes(16),
): string {
	if (!password) throw new Error("Password tidak boleh kosong");
	const hash = derive(password, salt, params);
	return [
		PREFIX,
		params.n,
		params.r,
		params.p,
		salt.toString("base64"),
		hash.toString("base64"),
	].join(":");
}

/** Returns false for malformed stored hashes instead of throwing. */
export function verifyDashboardPassword(
	password: string,
	stored: string | undefined,
): boolean {
	if (!password || !stored) return false;

	// Accept the legacy `$` separator too, in case an old value is still around.
	const parts = stored.trim().split(/[:$]/);
	if (parts.length !== 6 || parts[0] !== PREFIX) return false;

	const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
	const params = { n: Number(rawN), r: Number(rawR), p: Number(rawP) };
	if (
		!Number.isInteger(params.n) ||
		!Number.isInteger(params.r) ||
		!Number.isInteger(params.p) ||
		params.n <= 0 ||
		params.r <= 0 ||
		params.p <= 0
	) {
		return false;
	}

	const expected = Buffer.from(rawHash, "base64");
	if (expected.length !== KEY_LENGTH) return false;

	const actual = derive(password, Buffer.from(rawSalt, "base64"), params);
	return timingSafeEqual(actual, expected);
}

/**
 * Short, non-reversible fingerprint of the stored hash.
 *
 * Lets us answer "is the server using the same hash as my `.env`?" without
 * exposing the hash or the password: a stale process shows a different
 * fingerprint even though the length matches.
 */
export function fingerprintDashboardHash(stored: string | undefined): string {
	if (!stored) return "none";
	return createHash("sha256").update(stored).digest("hex").slice(0, 10);
}
