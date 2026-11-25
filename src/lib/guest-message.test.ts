import { describe, expect, it } from "vitest";
import { guestMessageChannel, renderGuestMessage } from "./guest-message";

const bodies = {
	anas: "{nama} dari {grup}",
	mila: "Halo {nama} ({grup})",
};

const guest = {
	name: "Budi Santoso",
	groupName: "Unhasy",
	address: "Jombang",
	invited: "Sekalian",
	slug: "budi-santoso",
	source: "anas" as const,
	blastChannel: null as "anas" | "mila" | null,
};

describe("guestMessageChannel", () => {
	it("falls back to the sheet of origin", () => {
		expect(guestMessageChannel(guest)).toBe("anas");
	});

	it("honours the per-guest sender override", () => {
		expect(guestMessageChannel({ ...guest, blastChannel: "mila" })).toBe(
			"mila",
		);
	});
});

describe("renderGuestMessage", () => {
	it("renders the template for the effective channel", () => {
		expect(renderGuestMessage(guest, bodies)).toBe("Budi Santoso dari Unhasy");
	});

	it("uses the override channel template", () => {
		expect(renderGuestMessage({ ...guest, blastChannel: "mila" }, bodies)).toBe(
			"Halo Budi Santoso (Unhasy)",
		);
	});

	it("keeps the invitation URL inside the message", () => {
		expect(renderGuestMessage(guest, { ...bodies, anas: "{link}" })).toBe(
			"https://anaslabs.my.id/invitation/budi-santoso",
		);
	});

	it("uses safe fallbacks for empty columns", () => {
		expect(
			renderGuestMessage(
				{ ...guest, groupName: null, address: null, invited: null },
				{ ...bodies, anas: "{grup}|{alamat}|{diundang}" },
			),
		).toBe("tamu|-|-");
	});
});
