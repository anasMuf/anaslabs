import { describe, expect, it } from "vitest";
import {
	autoGuestId,
	type ContactGuest,
	parseContactMatrix,
	parseCsvMatrix,
	phoneUpdateAction,
	suggestGuestMatches,
} from "./contact-import";

// Column order mirrors a Google Contacts export.
const HEADER = [
	"First Name",
	"Middle Name",
	"Last Name",
	"Nickname",
	"File As",
	"Phone 1 - Label",
	"Phone 1 - Value",
	"Phone 2 - Label",
	"Phone 2 - Value",
];

function contactRow(values: {
	first?: string;
	middle?: string;
	last?: string;
	nickname?: string;
	fileAs?: string;
	phone1?: string;
	phone2?: string;
}): string[] {
	return [
		values.first ?? "",
		values.middle ?? "",
		values.last ?? "",
		values.nickname ?? "",
		values.fileAs ?? "",
		"Mobile",
		values.phone1 ?? "",
		"Work",
		values.phone2 ?? "",
	];
}

describe("parseContactMatrix", () => {
	it("reads first/middle/last names and phone 1/2 from a Google Contacts sheet", () => {
		const result = parseContactMatrix([
			HEADER,
			contactRow({ first: "Alan", phone1: "+62 812-3444-4880" }),
			contactRow({
				first: "Jonathan",
				last: "Cypress",
				phone1: "6285190657313",
			}),
			contactRow({
				first: "Amel",
				phone1: "6285855000902",
				phone2: "6285777779556",
			}),
		]);

		expect(result.truncated).toBe(false);
		expect(result.skipped).toBe(0);
		expect(result.contacts).toEqual([
			{ rowNumber: 2, name: "Alan", phones: ["6281234444880"] },
			{ rowNumber: 3, name: "Jonathan Cypress", phones: ["6285190657313"] },
			{
				rowNumber: 4,
				name: "Amel",
				phones: ["6285855000902", "6285777779556"],
			},
		]);
	});

	it("normalises missing prefixes and mojibake-wrapped numbers", () => {
		const result = parseContactMatrix([
			HEADER,
			contactRow({ first: "Bisyri MQ", phone1: "81357971622" }),
			contactRow({ first: "Yuda", phone1: "‚Ä™+6285732555491‚Ä¨" }),
		]);

		expect(result.contacts.map((contact) => contact.phones)).toEqual([
			["6281357971622"],
			["6285732555491"],
		]);
	});

	it("splits several numbers packed into one cell", () => {
		const result = parseContactMatrix([
			HEADER,
			contactRow({
				first: "Hasan",
				phone1: "+62 819-7733-2483 ::: +6281977332483",
			}),
		]);

		// Both spellings normalise to the same digits.
		expect(result.contacts[0].phones).toEqual(["6281977332483"]);
	});

	it("falls back to File As when the name columns are empty", () => {
		const result = parseContactMatrix([
			HEADER,
			contactRow({ fileAs: "Natusi | Andre", phone1: "6289665116467" }),
		]);

		expect(result.contacts[0].name).toBe("Natusi | Andre");
	});

	it("skips rows without a name or without a usable number", () => {
		const result = parseContactMatrix([
			HEADER,
			contactRow({ first: "Citra", phone1: "12" }),
			contactRow({ phone1: "6281234567890" }),
			contactRow({ first: "Eko", phone1: "0857-4842-0667" }),
		]);

		expect(result.skipped).toBe(2);
		expect(result.contacts).toEqual([
			{ rowNumber: 4, name: "Eko", phones: ["6285748420667"] },
		]);
	});
});

describe("parseCsvMatrix", () => {
	it("parses quoted CSV and normalises a simple name/phone file", () => {
		const csv = [
			"Name,Phone",
			'"Santoso, Budi",0812-3456-7890',
			"Siti,+62 812 9999 0000",
		].join("\n");

		expect(parseCsvMatrix(csv)).toEqual([
			["Name", "Phone"],
			["Santoso, Budi", "0812-3456-7890"],
			["Siti", "+62 812 9999 0000"],
		]);

		const result = parseContactMatrix(parseCsvMatrix(csv));
		expect(result.contacts).toEqual([
			{ rowNumber: 2, name: "Santoso, Budi", phones: ["6281234567890"] },
			{ rowNumber: 3, name: "Siti", phones: ["6281299990000"] },
		]);
	});
});

const guests: ContactGuest[] = [
	{
		id: "1",
		name: "Wildan",
		slug: "wildan",
		source: "anas",
		groupName: null,
		phone: null,
	},
	{
		id: "2",
		name: "Wildan",
		slug: "wildan-2",
		source: "mila",
		groupName: null,
		phone: null,
	},
	{
		id: "3",
		name: "Fahmi",
		slug: "fahmi",
		source: "anas",
		groupName: null,
		phone: "628111111111",
	},
	{
		id: "4",
		name: "Cak Abid",
		slug: "cak-abid",
		source: "anas",
		groupName: null,
		phone: null,
	},
];

describe("suggestGuestMatches", () => {
	it("marks duplicate guest names as ambiguous", () => {
		const suggestions = suggestGuestMatches("Wildan", guests);
		expect(suggestions.map((entry) => entry.guestId)).toEqual(["1", "2"]);
		expect(suggestions.every((entry) => entry.ambiguous)).toBe(true);
		expect(autoGuestId(suggestions)).toBe("");
	});

	it("auto-picks a unique exact match", () => {
		const suggestions = suggestGuestMatches("FAHMI", guests);
		expect(suggestions[0]).toMatchObject({ guestId: "3", ambiguous: false });
		expect(autoGuestId(suggestions)).toBe("3");
	});

	it("suggests a partial token match without forcing it", () => {
		const suggestions = suggestGuestMatches("Abid", guests);
		expect(suggestions[0]).toMatchObject({ guestId: "4" });
		expect(suggestions[0].score).toBeLessThan(100);
	});
});

describe("phoneUpdateAction", () => {
	it("fills an empty number", () => {
		expect(phoneUpdateAction(null, "6281234567890", false)).toBe("fill");
	});

	it("reports identical numbers as unchanged", () => {
		expect(phoneUpdateAction("6281234567890", "6281234567890", true)).toBe(
			"same",
		);
	});

	it("skips conflicts by default", () => {
		expect(phoneUpdateAction("628111", "628222", false)).toBe("skip");
	});

	it("overwrites only when the user opts in", () => {
		expect(phoneUpdateAction("628111", "628222", true)).toBe("overwrite");
	});

	it("does nothing when the contact has no number", () => {
		expect(phoneUpdateAction("628111", null, false)).toBe("none");
	});
});
