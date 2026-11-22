import { createServerFn } from "@tanstack/react-start";
import { resolveGiftAccountNumber } from "./gift-accounts";

/**
 * Account number lookup for the invitation's gift cards.
 *
 * POST on purpose: the response should never be cached by the browser or an
 * intermediary. The number is returned only for a bank in the allow-list, so
 * an arbitrary input cannot read anything else.
 */
export const getGiftAccountNumber = createServerFn({ method: "POST" })
	.inputValidator((data: { bankName?: string }) => ({
		bankName: String(data?.bankName ?? "")
			.trim()
			.slice(0, 40),
	}))
	.handler(
		async ({ data }): Promise<string | null> =>
			resolveGiftAccountNumber(data.bankName),
	);
