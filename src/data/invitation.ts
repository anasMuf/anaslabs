/**
 * Single source of truth for the wedding invitation content.
 *
 * Figma: wedding-invitation-template, frame `main page` (384:110).
 * Nothing in `src/components/invitation/**` may hardcode invitation copy.
 */

import type { PhotoboothConfig } from "#/lib/photobooth/types";

export interface InvitationPerson {
	/** e.g. "Mempelai Pria" */
	label: string;
	fullName: string;
	/** e.g. "Putra dari Bapak … & Ibu …" */
	parents: string;
}

export interface InvitationSchedule {
	label: string;
	time: string;
}

export interface InvitationEvent {
	id: string;
	label: string;
	/** ISO date (YYYY-MM-DD), formatted with `formatEventDate`. */
	date: string;
	/** Used instead of `schedules` when the event runs all day. */
	time?: string;
	schedules?: InvitationSchedule[];
	location: {
		name: string;
		address: string;
		mapsUrl: string;
	};
}

export interface InvitationMilestone {
	date?: string;
	title: string;
	body?: string;
}

export interface InvitationGiftAccount {
	/** e.g. "Transfer Bank" */
	method: string;
	bankName: string;
	accountNumber: string;
	accountHolder: string;
}

export interface InvitationSectionCopy {
	heading: string;
	intro: string;
}

export const invitation = {
	couple: {
		bouquet: "/invitation/couple-bouquet.webp",
		groom: {
			label: "Mempelai Pria",
			fullName: "Muhammad Anas Mufti Akbar",
			parents: "Putra dari Bapak Abdul Rohim & Ibu Khoirul Izzah",
		},
		bride: {
			label: "Mempelai Wanita",
			fullName: "Fajriyatul Kamila",
			parents: "Putri dari Bapak Salamin & Ibu Siti Masrukhah",
		},
	},
	cover: {
		eyebrow: "Undangan Pernikahan",
		/** Displayed on two lines: "Anas" / "& Mila". */
		firstNames: "Anas",
		secondNames: "Mila",
		startDate: "2026-12-19",
		endDate: "2026-12-20",
		ornament: "/invitation/cover-ornament.webp",
		guestLabel: "Kepada,",
		scrollLabel: "Scroll Down",
	},
	sections: {
		couple: {
			heading: "Mempelai",
			intro: "Dengan penuh cinta, kami memperkenalkan kedua mempelai.",
		},
		event: {
			heading: "Hari Bahagia",
			intro:
				"Mari rayakan pernikahan Muhammad Anas Mufti Akbar dan Fajriyatul Kamila.",
		},
		story: {
			heading: "Kisah Kami",
			intro: "Sepenggal kisah perjalanan kami, menuju lembaran baru bersama.",
		},
		photobooth: {
			heading: "Potret Hari Ini,\nKenangan Abadi",
			intro: "Abadikan senyum dan momen bahagia bersama kami.",
			cta: "Buka Photobooth",
			camera: "/invitation/photobooth-camera.webp",
			keepsake: "/invitation/photobooth-keepsake.webp",
		},
		gift: {
			heading: "Tanda Kasih",
			intro:
				"Kehadiran dan doa Anda sudah berarti. Jika ingin berbagi tanda kasih, kami menerimanya dengan syukur.",
		},
		closing: {
			heading: "Terima Kasih",
			intro: "Terima kasih telah merayakan hari ini.",
		},
	},
	events: [
		{
			id: "akad-resepsi",
			label: "Akad & Resepsi",
			date: "2026-12-19",
			schedules: [
				{ label: "Akad Nikah", time: "08:00 WIB" },
				{ label: "Resepsi", time: "14:00 WIB" },
			],
			location: {
				name: "Blimbing RT03/RW01",
				address: "Kec. Kesamben, Kabupaten Jombang, Jawa Timur",
				mapsUrl:
					"https://www.google.com/maps/search/?api=1&query=Blimbing%20RT03%2FRW01%2C%20Kec.%20Kesamben%2C%20Kabupaten%20Jombang%2C%20Jawa%20Timur",
			},
		},
		{
			id: "unduh-mantu",
			label: "Unduh Mantu",
			date: "2026-12-20",
			time: "08:00 - 20:00 WIB",
			location: {
				name: "Setoyo RT03/RW02",
				address: "Balongmojo, Kec. Puri, Kabupaten Mojokerto, Jawa Timur",
				mapsUrl:
					"https://www.google.com/maps/search/?api=1&query=Setoyo%20RT03%2FRW02%2C%20Balongmojo%2C%20Kec.%20Puri%2C%20Kabupaten%20Mojokerto%2C%20Jawa%20Timur",
			},
		},
	] satisfies InvitationEvent[],
	story: [
		{ title: "Awal Pertemuan" },
		{ title: "Tumbuh Bersama" },
		{ title: "Lembaran Baru" },
	] as InvitationMilestone[],
	gifts: [
		{
			method: "Transfer Bank",
			bankName: "BCA",
			accountNumber: "0500576880",
			accountHolder: "M ANAS MUFTI AKBAR",
		},
		{
			method: "Transfer Bank",
			bankName: "BSI",
			accountNumber: "7262729588",
			accountHolder: "FAJRIYATUL KAMILA",
		},
	] satisfies InvitationGiftAccount[],
	giftThanks: "Terima kasih atas doa dan kemurahan hati Anda.",
	closing: {
		heading: "Kehadiran Anda\nsungguh berarti.",
		body: "Terima kasih telah berbagi kebahagiaan ini. Kasih, dukungan, dan doa Anda mengiringi langkah kami memulai hidup bersama.",
		label: "Dengan Cinta",
	},
	/** Background music; set to a URL in `public/invitation/music/` when available. */
	music: null as string | null,
	/** Photobooth card geometry (Figma 384:2760 / 384:2817 / 384:2787). */
	photobooth: {
		scale: 3,
		downloadName: "anas-mila-photobooth",
		card: {
			eyebrow: "THE WEDDING OF",
			names: "Anas & Mila",
			date: "19 - 20 Desember 2026",
		},
		layouts: {
			1: {
				width: 348,
				height: 530,
				textY: 448,
				slots: [{ x: 26, y: 32, w: 296, h: 393 }],
			},
			2: {
				width: 348,
				height: 542,
				textY: 454,
				slots: [
					{ x: 26, y: 38, w: 296, h: 193 },
					{ x: 26, y: 238, w: 296, h: 193 },
				],
			},
			4: {
				width: 348,
				height: 535,
				textY: 450,
				slots: [
					{ x: 26, y: 35, w: 144, h: 192 },
					{ x: 177, y: 35, w: 144, h: 192 },
					{ x: 26, y: 234, w: 144, h: 192 },
					{ x: 177, y: 234, w: 144, h: 192 },
				],
			},
		},
	} satisfies PhotoboothConfig,
} as const;

export type Invitation = typeof invitation;
