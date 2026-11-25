/**
 * Single-value TTL cache for server reads that hit Supabase on every request
 * but change rarely (invitation content and OG metadata).
 *
 * Concurrent callers share one in-flight read, so a burst of requests on a cold
 * start still issues a single query, and a rejected read is never cached: the
 * next caller retries instead of inheriting the failure for a full TTL.
 */
export interface TtlCache<T> {
	read(load: () => Promise<T>): Promise<T>;
	clear(): void;
}

export function createTtlCache<T>(
	ttlMs: number,
	now: () => number = Date.now,
): TtlCache<T> {
	let entry: { value: T; expiresAt: number } | null = null;
	let inflight: Promise<T> | null = null;

	return {
		async read(load) {
			if (entry && entry.expiresAt > now()) return entry.value;
			if (inflight) return inflight;

			inflight = load()
				.then((value) => {
					entry = { value, expiresAt: now() + ttlMs };
					return value;
				})
				.finally(() => {
					inflight = null;
				});

			return inflight;
		},
		clear() {
			entry = null;
		},
	};
}
