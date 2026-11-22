-- Kolom tambahan dari sheet baru (ALAMAT, DIUNDANG) + identitas tamu yang
-- boleh kembar namanya dalam satu sheet.
--
-- Kenapa identitas berubah:
-- Sheet Anas berisi dua "Wildan" di grup berbeda (Afindo dan Unhasy). Sebelumnya
-- `unique (source_sheet, name_key)` membuat yang kedua tidak mungkin disimpan,
-- dan parser juga membuang nama ganda dalam satu tempelan. Identitas tamu kini
-- adalah `(source_sheet, name_key, group_name)`: nama tetap boleh kembar selama
-- grupnya berbeda. `slug` tetap unik global dan tetap permanen.
--
-- Catatan: indeks dibuat sebagai ekspresi `coalesce(group_name, '')` supaya tamu
-- tanpa grup juga ikut unik (di Postgres, NULL tidak menabrak NULL).

alter table public.guests
	add column if not exists address text,
	add column if not exists invited text;

comment on column public.guests.address is
	'Kolom ALAMAT di sheet (kota/daerah asal tamu).';
comment on column public.guests.invited is
	'Kolom DIUNDANG di sheet; nilai "-" disimpan sebagai NULL, "Sekalian" disimpan apa adanya.';

alter table public.guests
	drop constraint if exists guests_source_sheet_name_key_key;

create unique index if not exists guests_identity_idx
	on public.guests (source_sheet, name_key, coalesce(group_name, ''));
