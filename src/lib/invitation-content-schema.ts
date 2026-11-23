/**
 * Editable invitation content: schema, defaults, and safe merging.
 *
 * `src/data/invitation.ts` stays the design-authored default. Everything the
 * dashboard may change is validated here before it can reach the invitation, so
 * one broken field can never take the whole page down.
 *
 * Pure module: no I/O, so it is safe to import from the client editor and from
 * unit tests.
 */

import { z } from "zod";
import { defaultContent } from "./invitation-content-default";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDateOnly(value: string): boolean {
	const match = DATE_ONLY.exec(value.trim());
	if (!match) return false;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

const dateOnly = z
	.string()
	.regex(DATE_ONLY, "Format tanggal harus YYYY-MM-DD.")
	.refine(isRealDateOnly, "Tanggal tidak valid.");

const text = (max: number) => z.string().min(1).max(max);
const optionalText = (max: number) => z.string().max(max).optional();
const assetPath = z.string().min(1).max(500);
const httpUrl = z
	.string()
	.min(1)
	.max(2048)
	.refine(isHttpUrl, "URL harus diawali http:// atau https://.");

const copySchema = z.object({
	heading: text(200),
	intro: text(1000),
});

const personSchema = z.object({
	label: text(80),
	fullName: text(160),
	parents: text(400),
});

const scheduleSchema = z.object({
	label: text(80),
	time: text(80),
});

const eventSchema = z
	.object({
		id: text(80),
		label: text(120),
		date: dateOnly,
		time: optionalText(120),
		schedules: z.array(scheduleSchema).min(1).max(8).optional(),
		location: z.object({
			name: text(200),
			address: text(400),
			mapsUrl: httpUrl,
		}),
	})
	.refine(
		(event) => Boolean(event.time) || Boolean(event.schedules?.length),
		"Acara harus punya jam (`time`) atau jadwal (`schedules`).",
	);

const milestoneSchema = z.object({
	date: optionalText(80),
	title: optionalText(200),
	body: optionalText(4000),
});

const giftSchema = z.object({
	method: text(80),
	bankName: text(60),
	side: z.enum(["groom", "bride"]),
	accountHolder: text(150),
});

const nonNegativeInt = z.number().int().nonnegative().max(10000);
const positiveInt = z.number().int().positive().max(10000);

const slotSchema = z.object({
	x: nonNegativeInt,
	y: nonNegativeInt,
	w: positiveInt,
	h: positiveInt,
});

const cardLayoutSchema = z.object({
	width: positiveInt,
	height: positiveInt,
	textY: nonNegativeInt,
	slots: z.array(slotSchema).min(1).max(4),
});

const photoboothSchema = z.object({
	scale: z.number().min(1).max(4),
	downloadName: text(120),
	card: z.object({
		eyebrow: text(80),
		names: text(160),
		date: text(120),
	}),
	layouts: z.object({
		"1": cardLayoutSchema,
		"2": cardLayoutSchema,
		"4": cardLayoutSchema,
	}),
	/** Frame overlay is authored by the phase-B editor; optional for now. */
	frame: z
		.object({
			url: assetPath,
			x: nonNegativeInt,
			y: nonNegativeInt,
			width: positiveInt,
		})
		.optional(),
});

const musicSchema = z
	.object({
		enabled: z.boolean(),
		url: httpUrl.nullable(),
		title: z.string().max(200).nullable(),
	})
	.refine(
		(music) => !music.enabled || Boolean(music.url),
		"Musik yang diaktifkan harus punya URL.",
	);

export const invitationContentSchema = z
	.object({
		couple: z.object({
			bouquet: assetPath,
			groom: personSchema,
			bride: personSchema,
		}),
		cover: z.object({
			eyebrow: text(120),
			firstNames: text(80),
			secondNames: text(80),
			startDate: dateOnly,
			endDate: dateOnly,
			ornament: assetPath,
			guestLabel: text(80),
			scrollLabel: text(80),
		}),
		sections: z.object({
			couple: copySchema,
			event: copySchema,
			story: copySchema,
			photobooth: copySchema.extend({
				cta: text(120),
				camera: assetPath,
				keepsake: assetPath,
			}),
			wall: copySchema.extend({
				eyebrow: text(80),
				cta: text(120),
				empty: text(600),
				back: text(120),
			}),
			gift: copySchema,
			closing: copySchema,
		}),
		events: z.array(eventSchema).min(1).max(8),
		sides: z.object({
			groom: z.object({ eventIds: z.array(text(80)).max(8) }),
			bride: z.object({ eventIds: z.array(text(80)).max(8) }),
		}),
		story: z.array(milestoneSchema).min(1).max(20),
		gifts: z.array(giftSchema).min(1).max(8),
		giftThanks: text(600),
		closing: z.object({
			heading: text(240),
			body: text(1000),
			label: text(80),
		}),
		music: musicSchema,
		photobooth: photoboothSchema,
	})
	.superRefine((content, ctx) => {
		const eventIds = new Set(content.events.map((event) => event.id));
		if (eventIds.size !== content.events.length) {
			ctx.addIssue({
				code: "custom",
				path: ["events"],
				message: "ID acara harus unik.",
			});
		}

		for (const side of ["groom", "bride"] as const) {
			for (const id of content.sides[side].eventIds) {
				if (!eventIds.has(id)) {
					ctx.addIssue({
						code: "custom",
						path: ["sides", side, "eventIds"],
						message: `Acara "${id}" tidak ada di daftar acara.`,
					});
				}
			}
		}

		for (const key of ["1", "2", "4"] as const) {
			const layout = content.photobooth.layouts[key];
			const expected = Number(key);

			if (layout.slots.length !== expected) {
				ctx.addIssue({
					code: "custom",
					path: ["photobooth", "layouts", key, "slots"],
					message: `Layout ${key} harus punya ${expected} slot.`,
				});
			}

			layout.slots.forEach((slot, index) => {
				if (slot.x + slot.w > layout.width || slot.y + slot.h > layout.height) {
					ctx.addIssue({
						code: "custom",
						path: ["photobooth", "layouts", key, "slots", index],
						message: "Slot keluar dari batas kanvas.",
					});
				}
			});
		}
	});

export type InvitationContent = z.infer<typeof invitationContentSchema>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merges stored content over the defaults. Arrays are replaced wholesale
 * (lists such as events and story chapters are edited as a whole).
 */
export function mergeContent(
	stored: unknown,
	base: unknown = defaultContent,
): unknown {
	if (!isRecord(stored)) return base;

	const baseRecord = isRecord(base) ? base : {};
	const merged: UnknownRecord = { ...baseRecord };

	for (const [key, value] of Object.entries(stored)) {
		const current = baseRecord[key];
		merged[key] =
			isRecord(value) && isRecord(current)
				? mergeContent(value, current)
				: value;
	}

	return merged;
}

export type ContentParseResult =
	| { ok: true; content: InvitationContent }
	| { ok: false; error: string; issues: string[] };

/** Merges with defaults, validates, and returns readable issue messages. */
export function parseContent(input: unknown): ContentParseResult {
	const result = invitationContentSchema.safeParse(mergeContent(input));
	if (result.success) return { ok: true, content: result.data };

	const issues = result.error.issues.map(
		(issue) => `${issue.path.join(".") || "konten"}: ${issue.message}`,
	);

	return {
		ok: false,
		error: issues[0] ?? "Konten tidak valid.",
		issues,
	};
}

/**
 * `true` when the stored row changed since the editor loaded it.
 *
 * Timestamps compare by instant, not by string: PostgREST may return
 * `+00:00` while the client holds the `Z` form of the same moment.
 */
export function contentVersionChanged(
	current: string | null,
	base: string | null,
): boolean {
	if (current === null && base === null) return false;
	if (current === null || base === null) return true;

	const currentTime = Date.parse(current);
	const baseTime = Date.parse(base);
	if (Number.isNaN(currentTime) || Number.isNaN(baseTime)) return true;

	return currentTime !== baseTime;
}
