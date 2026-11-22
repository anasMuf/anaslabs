/**
 * Bank account numbers for the gift section.
 *
 * Server-only: this module is imported by the `getGiftAccountNumber` server
 * function and never by a component, so the numbers stay out of the client
 * bundle. They only cross the wire after a guest opens a gift card.
 *
 * Plain module (no `createServerFn`) so the unit test can check the lookup
 * without booting the server-function runtime.
 */
const GIFT_ACCOUNT_NUMBERS: Record<string, string> = {
	BCA: "0500576880",
	BSI: "7262729588",
};

/** Case-insensitive bank lookup; `null` for a bank we do not publish. */
export function resolveGiftAccountNumber(bankName: string): string | null {
	const key = bankName.trim().toUpperCase();
	return GIFT_ACCOUNT_NUMBERS[key] ?? null;
}
