import { describe, expect, it } from "vitest";
import type { InvitationEvent } from "#/data/invitation";
import {
	buildInvitationView,
	type InvitationViewInput,
} from "./invitation-personalization";

const events: InvitationEvent[] = [
	{
		id: "akad-resepsi",
		label: "Akad & Resepsi",
		date: "2026-12-19",
		schedules: [{ label: "Akad Nikah", time: "08:00 WIB" }],
		location: { name: "Blimbing", address: "Jombang", mapsUrl: "https://maps" },
	},
	{
		id: "unduh-mantu",
		label: "Unduh Mantu",
		date: "2026-12-20",
		time: "08:00 - 20:00 WIB",
		location: { name: "Setoyo", address: "Mojokerto", mapsUrl: "https://maps" },
	},
];

const input = (overrides: Partial<InvitationViewInput> = {}) => ({
	side: null,
	cover: {
		firstNames: "Anas",
		secondNames: "Mila",
		startDate: "2026-12-19",
		endDate: "2026-12-20",
	},
	couple: {
		groom: {
			label: "Mempelai Pria",
			fullName: "Muhammad Anas Mufti Akbar",
			parents: "Putra dari …",
		},
		bride: {
			label: "Mempelai Wanita",
			fullName: "Fajriyatul Kamila",
			parents: "Putri dari …",
		},
	},
	events,
	gifts: [
		{
			method: "Transfer Bank",
			bankName: "BCA",
			side: "groom" as const,
			accountHolder: "M ANAS MUFTI AKBAR",
		},
		{
			method: "Transfer Bank",
			bankName: "BSI",
			side: "bride" as const,
			accountHolder: "FAJRIYATUL KAMILA",
		},
	],
	sides: {
		groom: { eventIds: ["unduh-mantu"] },
		bride: { eventIds: ["akad-resepsi"] },
	},
	eventIntro:
		"Mari rayakan pernikahan Muhammad Anas Mufti Akbar dan Fajriyatul Kamila.",
	...overrides,
});

describe("buildInvitationView", () => {
	it("keeps the current copy when the guest has no side", () => {
		const view = buildInvitationView(input());

		expect(view.firstNames).toBe("Anas");
		expect(view.secondNames).toBe("Mila");
		expect(view.coverDateLabel).toBe("19 - 20 Desember 2026");
		expect(view.events).toHaveLength(2);
		expect(view.gifts.map((gift) => gift.bankName)).toEqual(["BCA", "BSI"]);
		expect(view.people.map((person) => person.label)).toEqual([
			"Mempelai Pria",
			"Mempelai Wanita",
		]);
		expect(view.namesLabel).toBe("Anas & Mila");
		expect(view.eventIntro).toBe(
			"Mari rayakan pernikahan Muhammad Anas Mufti Akbar dan Fajriyatul Kamila.",
		);
	});

	it("puts the groom first and shows only his celebration", () => {
		const view = buildInvitationView(input({ side: "groom" }));

		expect(view.firstNames).toBe("Anas");
		expect(view.secondNames).toBe("Mila");
		expect(view.coverDateLabel).toBe("20 Desember 2026");
		expect(view.events.map((event) => event.id)).toEqual(["unduh-mantu"]);
		expect(view.gifts.map((gift) => gift.bankName)).toEqual(["BCA", "BSI"]);
		expect(view.people.map((person) => person.fullName)).toEqual([
			"Muhammad Anas Mufti Akbar",
			"Fajriyatul Kamila",
		]);
		expect(view.namesLabel).toBe("Anas & Mila");
		expect(view.eventIntro).toBe(
			"Mari rayakan pernikahan Muhammad Anas Mufti Akbar dan Fajriyatul Kamila.",
		);
	});

	it("puts the bride first and shows only her celebration", () => {
		const view = buildInvitationView(input({ side: "bride" }));

		expect(view.firstNames).toBe("Mila");
		expect(view.secondNames).toBe("Anas");
		expect(view.coverDateLabel).toBe("19 Desember 2026");
		expect(view.events.map((event) => event.id)).toEqual(["akad-resepsi"]);
		expect(view.gifts.map((gift) => gift.bankName)).toEqual(["BSI", "BCA"]);
		expect(view.people.map((person) => person.fullName)).toEqual([
			"Fajriyatul Kamila",
			"Muhammad Anas Mufti Akbar",
		]);
		expect(view.namesLabel).toBe("Mila & Anas");
		expect(view.eventIntro).toBe(
			"Mari rayakan pernikahan Fajriyatul Kamila dan Muhammad Anas Mufti Akbar.",
		);
	});

	it("falls back to the default range when a side has no matching event", () => {
		const view = buildInvitationView(
			input({
				side: "groom",
				sides: { groom: { eventIds: ["tidak-ada"] }, bride: { eventIds: [] } },
			}),
		);

		expect(view.events).toHaveLength(2);
		expect(view.coverDateLabel).toBe("19 - 20 Desember 2026");
		// Names are still ordered for the guest's side.
		expect(view.firstNames).toBe("Anas");
	});
});
