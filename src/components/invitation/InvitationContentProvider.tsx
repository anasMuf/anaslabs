import { createContext, type ReactNode, useContext } from "react";
import type { InvitationContent } from "#/lib/invitation-content-schema";

/**
 * Request-scoped invitation content.
 *
 * The route loader reads the stored document (merged with defaults) and puts it
 * here, so sections never import `data/invitation` directly. The dashboard
 * preview can mount the same components with unsaved content without a round
 * trip.
 */

const InvitationContentContext = createContext<{
	content: InvitationContent;
	preview: boolean;
} | null>(null);

export function InvitationContentProvider({
	content,
	preview = false,
	children,
}: {
	content: InvitationContent;
	preview?: boolean;
	children: ReactNode;
}) {
	return (
		<InvitationContentContext.Provider value={{ content, preview }}>
			{children}
		</InvitationContentContext.Provider>
	);
}

export function useInvitationContent(): InvitationContent {
	const value = useContext(InvitationContentContext);

	if (!value) {
		throw new Error(
			"useInvitationContent harus dipakai di dalam InvitationContentProvider.",
		);
	}

	return value.content;
}

/** True inside the dashboard live preview: no audio, no account numbers. */
export function useInvitationPreview(): boolean {
	return useContext(InvitationContentContext)?.preview ?? false;
}
