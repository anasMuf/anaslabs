// biome-ignore-all lint/suspicious/noArrayIndexKey: editor rows are fully controlled; list order mirrors the saved document and rows hold no independent state.
import type { InvitationContent } from "#/lib/invitation-content-schema";
import {
	DangerMiniButton,
	MiniButton,
	SectionCard,
	TextAreaField,
	TextField,
	ToggleField,
} from "./fields";
import MusicUpload from "./MusicUpload";

interface ContentEditorProps {
	value: InvitationContent;
	onChange: (next: InvitationContent) => void;
}

const selectClass =
	"mt-1 w-full rounded-xl border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[12px] text-inv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent";

const hintClass = "font-body text-[10px] leading-[1.6] text-inv-muted";
const subheadingClass =
	"font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-inv-accent";

function SideSelect({
	value,
	onChange,
}: {
	value: "groom" | "bride";
	onChange: (value: "groom" | "bride") => void;
}) {
	return (
		<label className="block">
			<span className="font-body text-[9.5px] font-semibold tracking-[0.12em] text-inv-muted">
				SISI
			</span>
			<select
				value={value}
				onChange={(event) =>
					onChange(event.target.value === "bride" ? "bride" : "groom")
				}
				className={selectClass}
			>
				<option value="groom">Anas (pria)</option>
				<option value="bride">Mila (wanita)</option>
			</select>
		</label>
	);
}

export default function ContentEditor({ value, onChange }: ContentEditorProps) {
	function updateCover(patch: Partial<InvitationContent["cover"]>) {
		onChange({ ...value, cover: { ...value.cover, ...patch } });
	}

	function updatePerson(
		side: "groom" | "bride",
		patch: Partial<InvitationContent["couple"]["groom"]>,
	) {
		onChange({
			...value,
			couple: {
				...value.couple,
				[side]: { ...value.couple[side], ...patch },
			},
		});
	}

	function updateSection(
		key: keyof InvitationContent["sections"],
		patch: Record<string, string>,
	) {
		onChange({
			...value,
			sections: {
				...value.sections,
				[key]: { ...value.sections[key], ...patch },
			} as InvitationContent["sections"],
		});
	}

	function updateEvent(
		index: number,
		patch: Partial<InvitationContent["events"][number]>,
	) {
		onChange({
			...value,
			events: value.events.map((event, eventIndex) =>
				eventIndex === index ? { ...event, ...patch } : event,
			),
		});
	}

	function setAudience(
		eventId: string,
		side: "groom" | "bride",
		checked: boolean,
	) {
		const eventIds = {
			groom: value.sides.groom.eventIds.filter((id) => id !== eventId),
			bride: value.sides.bride.eventIds.filter((id) => id !== eventId),
		};
		if (checked) eventIds[side].push(eventId);

		onChange({
			...value,
			sides: {
				groom: { eventIds: eventIds.groom },
				bride: { eventIds: eventIds.bride },
			},
		});
	}

	function updateSchedule(
		eventIndex: number,
		scheduleIndex: number,
		patch: Partial<{ label: string; time: string }>,
	) {
		const event = value.events[eventIndex];
		if (!event?.schedules) return;

		updateEvent(eventIndex, {
			schedules: event.schedules.map((schedule, index) =>
				index === scheduleIndex ? { ...schedule, ...patch } : schedule,
			),
		});
	}

	function addSchedule(eventIndex: number) {
		const event = value.events[eventIndex];
		if (!event) return;

		updateEvent(eventIndex, {
			schedules: [...(event.schedules ?? []), { label: "Jadwal", time: "" }],
			time: undefined,
		});
	}

	function removeSchedule(eventIndex: number, scheduleIndex: number) {
		const event = value.events[eventIndex];
		if (!event?.schedules) return;

		const schedules = event.schedules.filter(
			(_, index) => index !== scheduleIndex,
		);
		updateEvent(eventIndex, {
			schedules: schedules.length ? schedules : undefined,
			time: schedules.length ? undefined : "",
		});
	}

	function updateStory(
		index: number,
		patch: Partial<InvitationContent["story"][number]>,
	) {
		onChange({
			...value,
			story: value.story.map((milestone, milestoneIndex) =>
				milestoneIndex === index ? { ...milestone, ...patch } : milestone,
			),
		});
	}

	function updateGift(
		index: number,
		patch: Partial<InvitationContent["gifts"][number]>,
	) {
		onChange({
			...value,
			gifts: value.gifts.map((gift, giftIndex) =>
				giftIndex === index ? { ...gift, ...patch } : gift,
			),
		});
	}

	return (
		<div className="flex flex-col gap-4">
			<SectionCard
				title="Cover"
				description="Teks pembuka yang dilihat tamu pertama kali."
			>
				<TextField
					label="Eyebrow"
					value={value.cover.eyebrow}
					onChange={(eyebrow) => updateCover({ eyebrow })}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<TextField
						label="Nama pertama"
						value={value.cover.firstNames}
						onChange={(firstNames) => updateCover({ firstNames })}
					/>
					<TextField
						label="Nama kedua"
						value={value.cover.secondNames}
						onChange={(secondNames) => updateCover({ secondNames })}
					/>
					<TextField
						label="Tanggal mulai"
						type="date"
						value={value.cover.startDate}
						onChange={(startDate) => updateCover({ startDate })}
						hint="Dipakai bila tamu tidak punya sisi."
					/>
					<TextField
						label="Tanggal selesai"
						type="date"
						value={value.cover.endDate}
						onChange={(endDate) => updateCover({ endDate })}
					/>
					<TextField
						label="Label tamu"
						value={value.cover.guestLabel}
						onChange={(guestLabel) => updateCover({ guestLabel })}
					/>
					<TextField
						label="Label gulir"
						value={value.cover.scrollLabel}
						onChange={(scrollLabel) => updateCover({ scrollLabel })}
					/>
				</div>
				<p className={hintClass}>
					Tanggal cover tamu per sisi mengikuti tanggal acara sisi tersebut.
				</p>
			</SectionCard>

			<SectionCard
				title="Mempelai"
				description="Label dan nama orang tua untuk kedua mempelai."
			>
				{(["groom", "bride"] as const).map((side) => (
					<div
						key={side}
						className="rounded-2xl border border-inv-rule/70 bg-inv-bg px-3 py-3"
					>
						<p className={subheadingClass}>
							{side === "groom" ? "Anas (pria)" : "Mila (wanita)"}
						</p>
						<div className="mt-2 flex flex-col gap-2">
							<TextField
								label="Label"
								value={value.couple[side].label}
								onChange={(label) => updatePerson(side, { label })}
							/>
							<TextField
								label="Nama lengkap"
								value={value.couple[side].fullName}
								onChange={(fullName) => updatePerson(side, { fullName })}
							/>
							<TextAreaField
								label="Orang tua"
								rows={2}
								value={value.couple[side].parents}
								onChange={(parents) => updatePerson(side, { parents })}
							/>
						</div>
					</div>
				))}
			</SectionCard>

			<SectionCard
				title="Judul & intro bagian"
				description="Heading dan paragraf pembuka tiap section undangan."
			>
				<div className="grid gap-3 sm:grid-cols-2">
					<TextField
						label="Mempelai — judul"
						value={value.sections.couple.heading}
						onChange={(heading) => updateSection("couple", { heading })}
					/>
					<TextField
						label="Hari Bahagia — judul"
						value={value.sections.event.heading}
						onChange={(heading) => updateSection("event", { heading })}
					/>
					<TextField
						label="Kisah Kami — judul"
						value={value.sections.story.heading}
						onChange={(heading) => updateSection("story", { heading })}
					/>
					<TextField
						label="Tanda Kasih — judul"
						value={value.sections.gift.heading}
						onChange={(heading) => updateSection("gift", { heading })}
					/>
				</div>
				<TextAreaField
					label="Mempelai — intro"
					rows={2}
					value={value.sections.couple.intro}
					onChange={(intro) => updateSection("couple", { intro })}
				/>
				<TextAreaField
					label="Hari Bahagia — intro"
					rows={2}
					value={value.sections.event.intro}
					onChange={(intro) => updateSection("event", { intro })}
				/>
				<TextAreaField
					label="Kisah Kami — intro"
					rows={2}
					value={value.sections.story.intro}
					onChange={(intro) => updateSection("story", { intro })}
				/>
				<TextAreaField
					label="Tanda Kasih — intro"
					rows={2}
					value={value.sections.gift.intro}
					onChange={(intro) => updateSection("gift", { intro })}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<TextAreaField
						label="Photobooth — judul"
						rows={2}
						value={value.sections.photobooth.heading}
						onChange={(heading) => updateSection("photobooth", { heading })}
					/>
					<TextAreaField
						label="Penutup — judul"
						rows={2}
						value={value.sections.closing.heading}
						onChange={(heading) => updateSection("closing", { heading })}
					/>
				</div>
				<TextAreaField
					label="Photobooth — intro"
					rows={2}
					value={value.sections.photobooth.intro}
					onChange={(intro) => updateSection("photobooth", { intro })}
				/>
				<TextAreaField
					label="Penutup — intro"
					rows={2}
					value={value.sections.closing.intro}
					onChange={(intro) => updateSection("closing", { intro })}
				/>
			</SectionCard>

			<SectionCard
				title="Halaman Photo Wall"
				description="Teks di halaman wall yang dibuka dari section photobooth."
			>
				<TextField
					label="Eyebrow"
					value={value.sections.wall.eyebrow}
					onChange={(eyebrow) => updateSection("wall", { eyebrow })}
				/>
				<TextField
					label="Judul"
					value={value.sections.wall.heading}
					onChange={(heading) => updateSection("wall", { heading })}
				/>
				<TextAreaField
					label="Intro"
					rows={2}
					value={value.sections.wall.intro}
					onChange={(intro) => updateSection("wall", { intro })}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<TextField
						label="Tombol buka kamera"
						value={value.sections.wall.cta}
						onChange={(cta) => updateSection("wall", { cta })}
					/>
					<TextField
						label="Tombol kembali"
						value={value.sections.wall.back}
						onChange={(back) => updateSection("wall", { back })}
					/>
				</div>
				<TextAreaField
					label="Pesan saat wall kosong"
					rows={2}
					value={value.sections.wall.empty}
					onChange={(empty) => updateSection("wall", { empty })}
				/>
			</SectionCard>

			<SectionCard
				title="Acara"
				description="Satu kartu per acara. Tandai sisi yang diundang; tamu hanya melihat acara sisinya."
			>
				{value.events.map((event, index) => (
					<div
						key={event.id}
						className="rounded-2xl border border-inv-rule/70 bg-inv-bg px-3 py-3"
					>
						<p className={subheadingClass}>{event.id}</p>
						<div className="mt-2 flex flex-col gap-2">
							<div className="grid gap-2 sm:grid-cols-2">
								<TextField
									label="Nama acara"
									value={event.label}
									onChange={(label) => updateEvent(index, { label })}
								/>
								<TextField
									label="Tanggal"
									type="date"
									value={event.date}
									onChange={(date) => updateEvent(index, { date })}
								/>
							</div>

							<div className="flex flex-wrap gap-3">
								<ToggleField
									label="Tampil untuk Anas"
									checked={value.sides.groom.eventIds.includes(event.id)}
									onChange={(checked) =>
										setAudience(event.id, "groom", checked)
									}
								/>
								<ToggleField
									label="Tampil untuk Mila"
									checked={value.sides.bride.eventIds.includes(event.id)}
									onChange={(checked) =>
										setAudience(event.id, "bride", checked)
									}
								/>
							</div>

							{event.schedules?.length ? (
								<div className="flex flex-col gap-2">
									<p className={subheadingClass}>Rincian jadwal</p>
									{event.schedules.map((schedule, scheduleIndex) => (
										<div
											key={`${event.id}-${scheduleIndex}`}
											className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
										>
											<TextField
												label="Nama"
												value={schedule.label}
												onChange={(label) =>
													updateSchedule(index, scheduleIndex, { label })
												}
											/>
											<TextField
												label="Jam"
												value={schedule.time}
												onChange={(time) =>
													updateSchedule(index, scheduleIndex, { time })
												}
											/>
											<DangerMiniButton
												onClick={() => removeSchedule(index, scheduleIndex)}
											>
												Hapus
											</DangerMiniButton>
										</div>
									))}
									<div className="flex flex-wrap gap-2">
										<MiniButton
											onClick={() => addSchedule(index)}
											disabled={event.schedules.length >= 8}
										>
											Tambah jadwal
										</MiniButton>
										<MiniButton
											onClick={() =>
												updateEvent(index, {
													schedules: undefined,
													time: event.schedules?.[0]?.time ?? "",
												})
											}
										>
											Pakai satu jam
										</MiniButton>
									</div>
								</div>
							) : (
								<div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
									<TextField
										label="Jam"
										value={event.time ?? ""}
										onChange={(time) => updateEvent(index, { time })}
									/>
									<MiniButton
										onClick={() =>
											updateEvent(index, {
												time: undefined,
												schedules: [{ label: "Acara", time: event.time ?? "" }],
											})
										}
									>
										Rinci jadi jadwal
									</MiniButton>
								</div>
							)}

							<div className="grid gap-2 sm:grid-cols-2">
								<TextField
									label="Nama lokasi"
									value={event.location.name}
									onChange={(name) =>
										updateEvent(index, {
											location: { ...event.location, name },
										})
									}
								/>
								<TextField
									label="Alamat"
									value={event.location.address}
									onChange={(address) =>
										updateEvent(index, {
											location: { ...event.location, address },
										})
									}
								/>
							</div>
							<TextField
								label="Google Maps URL"
								type="url"
								value={event.location.mapsUrl}
								onChange={(mapsUrl) =>
									updateEvent(index, {
										location: { ...event.location, mapsUrl },
									})
								}
							/>
						</div>
					</div>
				))}
				<p className={hintClass}>
					Satu acara minimal punya jam tunggal atau satu baris jadwal. Acara
					tanpa sisi tetap tampil untuk tamu tanpa data sheet.
				</p>
			</SectionCard>

			<SectionCard
				title="Kisah Kami"
				description="Satu kartu swipe per bab cerita."
			>
				{value.story.map((milestone, index) => (
					<div
						key={`story-${index}`}
						className="rounded-2xl border border-inv-rule/70 bg-inv-bg px-3 py-3"
					>
						<div className="flex items-center justify-between gap-2">
							<p className={subheadingClass}>Bab {index + 1}</p>
							<DangerMiniButton
								onClick={() =>
									onChange({
										...value,
										story: value.story.filter(
											(_, storyIndex) => storyIndex !== index,
										),
									})
								}
								disabled={value.story.length <= 1}
							>
								Hapus
							</DangerMiniButton>
						</div>
						<div className="mt-2 flex flex-col gap-2">
							<TextField
								label="Label tanggal (opsional)"
								value={milestone.date ?? ""}
								onChange={(date) => updateStory(index, { date })}
							/>
							<TextField
								label="Judul (opsional)"
								value={milestone.title ?? ""}
								onChange={(title) => updateStory(index, { title })}
							/>
							<TextAreaField
								label="Isi"
								rows={4}
								value={milestone.body ?? ""}
								onChange={(body) => updateStory(index, { body })}
								hint="Gunakan **teks** untuk penebalan."
							/>
						</div>
					</div>
				))}
				<MiniButton
					onClick={() =>
						onChange({
							...value,
							story: [...value.story, { title: "Bab baru", body: "" }],
						})
					}
					disabled={value.story.length >= 20}
				>
					Tambah bab
				</MiniButton>
			</SectionCard>

			<SectionCard
				title="Tanda Kasih"
				description="Nomor rekening tetap disimpan di server dan tidak bisa diedit dari sini."
			>
				{value.gifts.map((gift, index) => (
					<div
						key={`gift-${index}`}
						className="rounded-2xl border border-inv-rule/70 bg-inv-bg px-3 py-3"
					>
						<div className="flex items-center justify-between gap-2">
							<p className={subheadingClass}>Rekening {index + 1}</p>
							<DangerMiniButton
								onClick={() =>
									onChange({
										...value,
										gifts: value.gifts.filter(
											(_, giftIndex) => giftIndex !== index,
										),
									})
								}
								disabled={value.gifts.length <= 1}
							>
								Hapus
							</DangerMiniButton>
						</div>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">
							<TextField
								label="Metode"
								value={gift.method}
								onChange={(method) => updateGift(index, { method })}
							/>
							<TextField
								label="Bank"
								value={gift.bankName}
								onChange={(bankName) => updateGift(index, { bankName })}
							/>
							<SideSelect
								value={gift.side}
								onChange={(side) => updateGift(index, { side })}
							/>
							<TextField
								label="Nama pemilik"
								value={gift.accountHolder}
								onChange={(accountHolder) =>
									updateGift(index, { accountHolder })
								}
							/>
						</div>
					</div>
				))}
				<MiniButton
					onClick={() =>
						onChange({
							...value,
							gifts: [
								...value.gifts,
								{
									method: "Transfer Bank",
									bankName: "",
									side: "groom",
									accountHolder: "",
								},
							],
						})
					}
					disabled={value.gifts.length >= 8}
				>
					Tambah rekening
				</MiniButton>
				<TextAreaField
					label="Ucapan terima kasih"
					rows={2}
					value={value.giftThanks}
					onChange={(giftThanks) => onChange({ ...value, giftThanks })}
				/>
			</SectionCard>

			<SectionCard
				title="Penutup"
				description="Kalimat terakhir dan label penanda tangan."
			>
				<TextAreaField
					label="Judul besar"
					rows={2}
					value={value.closing.heading}
					onChange={(heading) =>
						onChange({
							...value,
							closing: { ...value.closing, heading },
						})
					}
				/>
				<TextAreaField
					label="Paragraf"
					rows={3}
					value={value.closing.body}
					onChange={(body) =>
						onChange({ ...value, closing: { ...value.closing, body } })
					}
				/>
				<TextField
					label="Label"
					value={value.closing.label}
					onChange={(label) =>
						onChange({ ...value, closing: { ...value.closing, label } })
					}
				/>
			</SectionCard>

			<SectionCard
				title="Musik latar"
				description="File audio dari dashboard atau tautan YouTube."
			>
				<ToggleField
					label="Aktifkan musik"
					checked={value.music.enabled}
					onChange={(enabled) =>
						onChange({ ...value, music: { ...value.music, enabled } })
					}
					hint="Musik baru diputar setelah tamu berinteraksi dengan halaman."
				/>
				<TextField
					label="URL audio / YouTube"
					type="url"
					value={value.music.url ?? ""}
					onChange={(url) =>
						onChange({ ...value, music: { ...value.music, url: url || null } })
					}
					placeholder="https://youtu.be/… atau URL file audio"
				/>
				<MusicUpload
					onUploaded={(url) =>
						onChange({
							...value,
							music: { ...value.music, url, enabled: true },
						})
					}
				/>
				<TextField
					label="Judul lagu (opsional)"
					value={value.music.title ?? ""}
					onChange={(title) =>
						onChange({
							...value,
							music: { ...value.music, title: title || null },
						})
					}
				/>
			</SectionCard>
		</div>
	);
}
