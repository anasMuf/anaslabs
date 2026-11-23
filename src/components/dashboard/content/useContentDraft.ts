import { useEffect, useState } from "react";
import { useToast } from "#/components/invitation/ui/Toast";
import {
	resetInvitationContent,
	saveInvitationContent,
} from "#/lib/invitation-content";
import { defaultContent } from "#/lib/invitation-content-default";
import type { InvitationContent } from "#/lib/invitation-content-schema";

export interface ContentDraftInitial {
	content: InvitationContent;
	updatedAt: string | null;
	updatedBy: string | null;
	invalidStored: boolean;
}

export interface ContentDraft {
	content: InvitationContent;
	update: (next: InvitationContent) => void;
	save: () => Promise<void>;
	resetAll: () => Promise<void>;
	dirty: boolean;
	saving: boolean;
	errorText: string | null;
	baseUpdatedAt: string | null;
	updatedBy: string | null;
	status: string;
}

/**
 * Shared save/reset state for the content and photobooth editors.
 *
 * Both pages edit the same document, so the concurrency token, dirty guard, and
 * toast messages live here instead of being reimplemented per screen.
 */
export function useContentDraft(initial: ContentDraftInitial): ContentDraft {
	const toast = useToast();
	const [content, setContent] = useState<InvitationContent>(initial.content);
	const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(
		initial.updatedAt,
	);
	const [updatedBy, setUpdatedBy] = useState<string | null>(initial.updatedBy);
	const [dirty, setDirty] = useState(
		initial.invalidStored || initial.updatedAt === null,
	);
	const [saving, setSaving] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	function update(next: InvitationContent) {
		setContent(next);
		setDirty(true);
		setErrorText(null);
	}

	async function save() {
		setSaving(true);
		setErrorText(null);

		try {
			const result = await saveInvitationContent({
				data: { content, baseUpdatedAt },
			});

			if (!result.ok) {
				setErrorText(result.error);
				toast({ message: result.error });
				return;
			}

			setBaseUpdatedAt(result.updatedAt);
			setUpdatedBy(null);
			setDirty(false);
			toast({
				tone: "success",
				message: "Konten disimpan dan langsung tayang di undangan.",
			});
		} catch {
			const message = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
			setErrorText(message);
			toast({ message });
		} finally {
			setSaving(false);
		}
	}

	/** Writes the authored defaults; callers ask for confirmation first. */
	async function resetAll() {
		setSaving(true);
		setErrorText(null);

		try {
			const result = await resetInvitationContent({ data: { baseUpdatedAt } });

			if (!result.ok) {
				setErrorText(result.error);
				toast({ message: result.error });
				return;
			}

			setContent(structuredClone(defaultContent));
			setBaseUpdatedAt(result.updatedAt);
			setUpdatedBy(null);
			setDirty(false);
			toast({ tone: "success", message: "Konten dikembalikan ke default." });
		} catch {
			const message = "Gagal mereset konten.";
			setErrorText(message);
			toast({ message });
		} finally {
			setSaving(false);
		}
	}

	const status = dirty
		? "Belum disimpan"
		: baseUpdatedAt
			? "Tersimpan"
			: "Memakai default";

	return {
		content,
		update,
		save,
		resetAll,
		dirty,
		saving,
		errorText,
		baseUpdatedAt,
		updatedBy,
		status,
	};
}
