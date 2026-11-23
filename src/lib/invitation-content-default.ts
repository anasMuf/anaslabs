import { invitation } from "#/data/invitation";
import type { InvitationContent } from "./invitation-content-schema";

/**
 * Authored defaults, kept free of zod so the guest-facing bundle does not pay
 * for validation code.
 *
 * The cast is intentional: `data/invitation.ts` is `as const`, while stored
 * content is mutable. `invitation-content.test.ts` asserts that
 * `invitationContentSchema.parse(defaultContent)` succeeds, so the shape stays
 * honest without a runtime parse on every page load.
 */
export const defaultContent = invitation as unknown as InvitationContent;
