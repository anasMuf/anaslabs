import { describe, expect, it } from "vitest";
import { prepareLinkPreviewMessage } from "./link-preview";

describe("prepareLinkPreviewMessage", () => {
	it("leaves a message without a URL untouched", () => {
		expect(prepareLinkPreviewMessage("Halo Budi")).toEqual({
			text: "Halo Budi",
			url: null,
			displayText: "Halo Budi",
		});
	});

	it("moves a dangling link label to the end and shows the URL", () => {
		const message =
			"Assalamu'alaikum Alan,\n\nBuka undangan: https://anaslabs.my.id/invitation/alan\n\nTerima kasih.";
		expect(prepareLinkPreviewMessage(message)).toEqual({
			text: "Assalamu'alaikum Alan,\n\nTerima kasih.\n\nBuka undangan:",
			url: "https://anaslabs.my.id/invitation/alan",
			displayText:
				"Assalamu'alaikum Alan,\n\nTerima kasih.\n\nBuka undangan:\nhttps://anaslabs.my.id/invitation/alan",
		});
	});

	it("handles a message that is only a URL", () => {
		expect(
			prepareLinkPreviewMessage("https://anaslabs.my.id/invitation/alan"),
		).toEqual({
			text: "",
			url: "https://anaslabs.my.id/invitation/alan",
			displayText: "https://anaslabs.my.id/invitation/alan",
		});
	});

	it("keeps inline sentence text while separating the URL", () => {
		const prepared = prepareLinkPreviewMessage(
			"Silakan buka https://anaslabs.my.id/invitation/alan ya",
		);
		expect(prepared.text).toBe("Silakan buka ya");
		expect(prepared.displayText).toBe(
			"Silakan buka ya\nhttps://anaslabs.my.id/invitation/alan",
		);
	});
});
