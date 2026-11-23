-- Konten undangan yang bisa diedit dari dashboard.
--
-- Satu baris (`id = 1`) menyimpan seluruh dokumen yang boleh diedit sebagai
-- `jsonb`. Undangan membaca baris ini (di-merge dengan default di
-- `src/data/invitation.ts`); kalau tabel belum ada atau barisnya kosong,
-- undangan tetap memakai default.
--
-- Nomor rekening TIDAK ikut di sini: nomor tetap server-only di
-- `src/lib/gift-accounts.ts` karena dokumen ini dikirim ke browser tamu.

create table if not exists public.invitation_content (
	id smallint primary key default 1,
	content jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now(),
	updated_by text,
	constraint invitation_content_singleton check (id = 1)
);

comment on table public.invitation_content is
	'Dokumen konten undangan yang diedit dari dashboard (satu baris).';
comment on column public.invitation_content.updated_by is
	'Email dashboard yang terakhir menyimpan; dipakai untuk audit ringan.';

-- RLS aktif tanpa policy: hanya service key (server function) yang boleh
-- membaca/menulis, sama seperti tabel guests.
alter table public.invitation_content enable row level security;
