/**
 * Tiny in-memory attempt limiter.
 *
 * One process, two users: a Map is enough and avoids a table for something that
 * only needs to slow down password guessing. State resets on deploy, which is
 * acceptable because an attacker cannot restart the server.
 */

export interface RateLimitState {
	count: number;
	resetAt: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfterMs: number;
}

export function checkRateLimit(
	state: RateLimitState | undefined,
	now: number,
	limit: number,
): RateLimitResult {
	if (!state || now >= state.resetAt) {
		return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
	}

	if (state.count >= limit) {
		return { allowed: false, remaining: 0, retryAfterMs: state.resetAt - now };
	}

	return { allowed: true, remaining: limit - state.count - 1, retryAfterMs: 0 };
}

/** Returns the state to store after an attempt was made. */
export function recordAttempt(
	state: RateLimitState | undefined,
	now: number,
	windowMs: number,
): RateLimitState {
	if (!state || now >= state.resetAt) {
		return { count: 1, resetAt: now + windowMs };
	}

	return { count: state.count + 1, resetAt: state.resetAt };
}
