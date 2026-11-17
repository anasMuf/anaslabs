#!/usr/bin/env node
// Usage:
//   node scripts/dashboard-password.mjs "password-anda"
//       → cetak DASHBOARD_PASSWORD_HASH untuk .env
//
//   node scripts/dashboard-password.mjs --verify "password-anda"
//       → cek apakah password itu cocok dengan hash di .env (tanpa server)
//
// Password tidak pernah disimpan oleh skrip ini.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MIN_LENGTH = 8;

const args = process.argv.slice(2);
const verifyMode = args[0] === "--verify";
const password = verifyMode ? args[1] : args[0];

if (!password) {
	console.error(
		"Pemakaian:\n" +
			'  node scripts/dashboard-password.mjs "password-anda"\n' +
			'  node scripts/dashboard-password.mjs --verify "password-anda"',
	);
	process.exit(1);
}

/** Reads DASHBOARD_PASSWORD_HASH the same way Vite/dotenv would. */
function readStoredHash() {
	let raw;
	try {
		raw = readFileSync(".env", "utf8");
	} catch {
		return { value: null, note: ".env tidak ditemukan di folder ini" };
	}

	let value = null;
	for (const line of raw.split(/\r?\n/)) {
		if (!line.startsWith("DASHBOARD_PASSWORD_HASH=")) continue;
		value = line.slice("DASHBOARD_PASSWORD_HASH=".length).trim();
	}
	if (value === null)
		return { value: null, note: "baris DASHBOARD_PASSWORD_HASH tidak ada" };

	value = value.replace(/^["']|["']$/g, "").trim();
	return { value, note: null };
}

function describe(stored) {
	const parts = stored.split(/[:$]/);
	return {
		length: stored.length,
		separator: stored.includes(":") ? ":" : "$",
		parts: parts.length,
		prefix: parts[0],
		looksValid: parts.length === 6 && parts[0] === "scrypt",
	};
}

if (verifyMode) {
	const { value, note } = readStoredHash();
	if (!value) {
		console.error(`Cek hash gagal: ${note}.`);
		process.exit(1);
	}

	const info = describe(value);
	console.log("hash di .env:", info);

	if (!info.looksValid) {
		console.error(
			"\nHash tidak berbentuk scrypt:N:r:p:salt:hash — kemungkinan terpotong atau rusak.",
		);
		process.exit(1);
	}

	const [, rawN, rawR, rawP, rawSalt, rawHash] = value.split(/[:$]/);
	const params = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
	const expected = Buffer.from(rawHash, "base64");
	const actual = scryptSync(
		password.normalize("NFKC"),
		Buffer.from(rawSalt, "base64"),
		KEY_LENGTH,
		{
			N: params.N,
			r: params.r,
			p: params.p,
			maxmem: 128 * params.N * params.r * 2,
		},
	);

	const match =
		expected.length === actual.length && timingSafeEqual(actual, expected);
	console.log(
		match
			? "\nCOCOK: password ini adalah password yang dipakai untuk hash tersebut."
			: "\nTIDAK COCOK: hash di .env dibuat dari password lain. Buat ulang dengan perintah tanpa --verify.",
	);
	process.exit(match ? 0 : 1);
}

if (password.length < MIN_LENGTH) {
	console.error(`Password terlalu pendek: minimal ${MIN_LENGTH} karakter.`);
	process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
	N,
	r: R,
	p: P,
	maxmem: 128 * N * R * 2,
});

const stored = [
	"scrypt",
	N,
	R,
	P,
	salt.toString("base64"),
	hash.toString("base64"),
].join(":");

console.log(
	"\nTambahkan baris ini ke .env (lokal) dan ~/anaslabs/.env (VPS):\n",
);
console.log(`DASHBOARD_PASSWORD_HASH=${stored}\n`);
console.log(
	"Catatan: format memakai pemisah ':' karena Vite/dotenv mengekspansi '$' di nilai .env.\n",
);
console.log("Lalu restart server (env dibaca saat start).");
