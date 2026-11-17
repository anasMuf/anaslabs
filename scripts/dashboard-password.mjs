#!/usr/bin/env node
// Usage:
//   node scripts/dashboard-password.mjs "password-panjang-anda"
//
// Prints a scrypt hash to paste into DASHBOARD_PASSWORD_HASH. The password
// itself is never stored anywhere by this script.

import { randomBytes, scryptSync } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

const password = process.argv[2];

if (!password) {
	console.error(
		'Pemakaian: node scripts/dashboard-password.mjs "password-anda"\n' +
			"Password tidak disimpan oleh skrip ini.",
	);
	process.exit(1);
}

if (password.length < 12) {
	console.error("Password terlalu pendek: minimal 12 karakter.");
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
