import { describe, expect, it } from "vitest";
import { type BlastGuestInput, planAudience } from "./eligibility";

function guest(overrides: Partial<BlastGuestInput> = {}): BlastGuestInput {
	return {
		id: "g1",
		name: "Budi",
		slug: "budi",
		groupName: "Unhasy",
		address: "Jombang",
		invited: null,
		source: "anas",
		delivery: "digital",
		phone: "628123456789",
		sentAt: null,
		archived: false,
		blastChannel: null,
		...overrides,
	};
}

describe("planAudience", () => {
	it("accepts a digital guest with a phone", () => {
		const plan = planAudience([guest()], {
			enabledChannels: { anas: true, mila: true },
		});

		expect(plan.eligible).toHaveLength(1);
		expect(plan.counts).toEqual({ anas: 1, mila: 0 });
		expect(plan.eligible[0]?.channel).toBe("anas");
	});

	it("uses the per-guest channel override", () => {
		const plan = planAudience([guest({ blastChannel: "mila" })], {
			enabledChannels: { anas: true, mila: true },
		});

		expect(plan.eligible[0]?.channel).toBe("mila");
		expect(plan.counts).toEqual({ anas: 0, mila: 1 });
	});

	it("skips archived, physical, and phoneless guests", () => {
		const plan = planAudience(
			[
				guest({ id: "a", archived: true }),
				guest({ id: "b", delivery: "fisik" }),
				guest({ id: "c", phone: null }),
			],
			{ enabledChannels: { anas: true } },
		);

		expect(plan.eligible).toHaveLength(0);
		expect(plan.skippedCounts).toMatchObject({
			arsip: 1,
			fisik: 1,
			"tanpa-nomor": 1,
		});
	});

	it("skips guests already in the queue and already sent when asked", () => {
		const plan = planAudience(
			[
				guest({ id: "busy" }),
				guest({ id: "sent", sentAt: "2026-01-01T00:00:00Z" }),
			],
			{
				onlyUnsent: true,
				enabledChannels: { anas: true },
				busyGuestIds: new Set(["busy"]),
			},
		);

		expect(plan.eligible).toHaveLength(0);
		expect(plan.skippedCounts["sedang-antre"]).toBe(1);
		expect(plan.skippedCounts["sudah-terkirim"]).toBe(1);
	});

	it("skips guests whose channel is disabled", () => {
		const plan = planAudience(
			[guest({ source: "anas" }), guest({ id: "m1", source: "mila" })],
			{ enabledChannels: { anas: true, mila: false } },
		);

		expect(plan.counts).toEqual({ anas: 1, mila: 0 });
		expect(plan.skippedCounts["kanal-nonaktif"]).toBe(1);
	});

	it("filters by channel before counting", () => {
		const plan = planAudience(
			[guest({ source: "anas" }), guest({ id: "m1", source: "mila" })],
			{ channelFilter: "mila", enabledChannels: { anas: true, mila: true } },
		);

		expect(plan.eligible).toHaveLength(1);
		expect(plan.eligible[0]?.guest.id).toBe("m1");
		expect(plan.skipped).toHaveLength(0);
	});
});
