import { describe, expect, it } from "vitest";
import { checkRateLimit, recordAttempt } from "./rate-limit";

const WINDOW = 60_000;
const LIMIT = 3;

describe("rate limit", () => {
	it("allows the first attempts and blocks past the limit", () => {
		const now = 1_000_000;
		const state = checkRateLimit(undefined, now, LIMIT);
		expect(state.allowed).toBe(true);

		let stored = recordAttempt(undefined, now, WINDOW);
		stored = recordAttempt(stored, now + 1, WINDOW);
		stored = recordAttempt(stored, now + 2, WINDOW);

		expect(checkRateLimit(stored, now + 3, LIMIT).allowed).toBe(false);
	});

	it("reports how long to wait", () => {
		const now = 1_000_000;
		let stored = recordAttempt(undefined, now, WINDOW);
		stored = recordAttempt(stored, now, WINDOW);
		stored = recordAttempt(stored, now, WINDOW);

		const result = checkRateLimit(stored, now + 5_000, LIMIT);
		expect(result.allowed).toBe(false);
		expect(result.retryAfterMs).toBe(55_000);
	});

	it("resets once the window elapses", () => {
		const now = 1_000_000;
		let stored = recordAttempt(undefined, now, WINDOW);
		stored = recordAttempt(stored, now, WINDOW);
		stored = recordAttempt(stored, now, WINDOW);

		const afterWindow = now + WINDOW;
		expect(checkRateLimit(stored, afterWindow, LIMIT).allowed).toBe(true);
		expect(recordAttempt(stored, afterWindow, WINDOW).count).toBe(1);
	});
});
