import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { InvitationContentProvider } from "#/components/invitation/InvitationContentProvider";
import InvitationSections from "#/components/invitation/InvitationSections";
import { ToastProvider } from "#/components/invitation/ui/Toast";
import { getDashboardUser } from "#/lib/dashboard-auth";
import { getInvitationContent } from "#/lib/invitation-content";
import type { InvitationContent } from "#/lib/invitation-content-schema";
import type { GuestSide } from "#/lib/invitation-personalization";
import { getInvitationView } from "#/lib/invitation-view";

/**
 * Live preview target for `/dashboard/konten`.
 *
 * Loads the saved document first (so the frame is never empty), then replaces
 * it with the editor's unsaved copy over `postMessage`. Deliberately not a
 * guest page: no tracking, no music autoplay, no account-number fetch.
 */
export const Route = createFileRoute("/undangan-preview")({
	loader: async () => {
		const user = await getDashboardUser();
		if (!user) throw redirect({ to: "/dashboard/login" });

		return { content: await getInvitationContent() };
	},
	head: () => ({
		meta: [
			{ title: "Pratinjau Undangan" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: PreviewPage,
});

interface PreviewMessage {
	type?: unknown;
	content?: unknown;
	side?: unknown;
}

function PreviewPage() {
	const { content: initial } = Route.useLoaderData();
	const [content, setContent] = useState<InvitationContent>(initial);
	const [side, setSide] = useState<GuestSide | null>(null);

	useEffect(() => {
		const origin = window.location.origin;

		const handleMessage = (event: MessageEvent) => {
			if (event.origin !== origin) return;

			const message = event.data as PreviewMessage | null;
			if (!message || typeof message.type !== "string") return;

			if (
				message.type === "invitation:content" &&
				message.content &&
				typeof message.content === "object"
			) {
				setContent(message.content as InvitationContent);
				return;
			}

			if (message.type === "invitation:side") {
				const next = message.side;
				setSide(next === "groom" || next === "bride" ? next : null);
			}
		};

		window.addEventListener("message", handleMessage);
		// Tell the editor we are listening so it can send its first draft.
		window.parent.postMessage({ type: "invitation:ready" }, origin);

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	const view = getInvitationView(side, content);

	return (
		<InvitationContentProvider content={content} preview>
			<ToastProvider>
				<main className="invite-scroller h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto no-scrollbar touch-pan-y bg-inv-bg font-body text-inv-ink">
					<InvitationSections
						slug="preview"
						guestName="Tamu Undangan"
						caption="Contoh grup tamu"
						view={view}
					/>
				</main>
			</ToastProvider>
		</InvitationContentProvider>
	);
}
