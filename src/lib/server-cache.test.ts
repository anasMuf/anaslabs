import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "./server-cache";

describe("createTtlCache", () => {
	it("loads once while the entry is fresh", async () => {
		let clock = 0;
		const cache = createTtlCache<number>(1_000, () => clock);
		const load = vi.fn(async () => 1);

		expect(await cache.read(load)).toBe(1);
		clock = 999;
		expect(await cache.read(load)).toBe(1);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it("reloads after the TTL expires", async () => {
		let clock = 0;
		const cache = createTtlCache<number>(1_000, () => clock);
		let value = 1;
		const load = vi.fn(async () => value++);

		expect(await cache.read(load)).toBe(1);
		clock = 1_001;
		expect(await cache.read(load)).toBe(2);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it("shares one in-flight read between concurrent callers", async () => {
		let resolve!: (value: number) => void;
		const pending = new Promise<number>((done) => {
			resolve = done;
		});
		const cache = createTtlCache<number>(1_000, () => 0);
		const load = vi.fn(() => pending);

		const first = cache.read(load);
		const second = cache.read(load);
		resolve(5);

		expect(await first).toBe(5);
		expect(await second).toBe(5);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it("forces a reload after clear()", async () => {
		const cache = createTtlCache<number>(60_000, () => 0);
		let value = 1;
		const load = vi.fn(async () => value++);

		expect(await cache.read(load)).toBe(1);
		cache.clear();
		expect(await cache.read(load)).toBe(2);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it("does not cache a rejected read", async () => {
		const cache = createTtlCache<string>(60_000, () => 0);
		const load = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce("ok");

		await expect(cache.read(load)).rejects.toThrow("boom");
		expect(await cache.read(load)).toBe("ok");
		expect(load).toHaveBeenCalledTimes(2);
	});
});
