-- Tamu undangan hasil impor Google Sheets (tempel-salin, bukan sync otomatis).
--
-- Satu baris = satu tamu. `slug` adalah identitas permanen: dibuat sekali saat
-- impor pertama dan tidak pernah diubah, supaya link yang sudah tersebar tidak
-- mati walaupun nama/grup di sheet berubah.
--
-- Keputusan yang membentuk tabel ini (lihat docs/invitation/dashboard.md):
-- - Slug = nama saja (`cak-abid`), tanpa karakter acak. Nama kembar diberi
--   akhiran `-2`, `-3`, dst. Konsekuensinya link bisa dienumerasi; halaman
--   undangan karena itu tidak pernah menampilkan nomor HP atau grup.
-- - Tamu `fisik` tetap dibuatkan baris (dan slug) demi status cetak, tetapi
--   tidak dibagikan link-nya.
-- - `archived_at` dipakai ketika nama hilang dari sheet: kartu tidak dihapus
--   agar link lama tetap hidup.

create table if not exists public.guests (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null check (char_length(name) between 1 and 80),
	-- Nama yang dinormalisasi (huruf kecil, spasi dirapatkan); kunci pencocokan
	-- saat impor ulang, karena sheet tidak punya ID baris yang stabil.
	name_key text not null,
	source_sheet text not null check (source_sheet in ('anas', 'mila')),
	group_name text,
	delivery text not null default 'digital' check (delivery in ('digital', 'fisik')),
	phone text,
	sent_at timestamptz,
	invitation_opened_at timestamptz,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (source_sheet, name_key)
);

comment on table public.guests is
	'Tamu undangan; hanya diakses lewat server function dengan secret key.';
comment on column public.guests.slug is
	'Identitas permanen di /invitation/:slug. Nama saja, akhiran -2 bila kembar.';
comment on column public.guests.archived_at is
	'Terisi saat nama tidak lagi ada di sheet; baris dipertahankan agar link lama hidup.';

-- Daftar tamu di dashboard selalu per sumber, urut nama.
create index if not exists guests_source_name_idx
	on public.guests (source_sheet, name_key);

-- Pelacakan buka undangan mencari baris berdasarkan slug.
create index if not exists guests_opened_idx
	on public.guests (invitation_opened_at)
	where invitation_opened_at is not null;

alter table public.guests enable row level security;
