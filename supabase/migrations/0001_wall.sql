-- Wall kartu untuk undangan: satu baris = satu foto + ucapan tamu.
--
-- Semua akses (baca & tulis) lewat server function kita memakai secret key,
-- jadi tabel ini sengaja TIDAK punya policy untuk anon/publishable key. RLS
-- tetap diaktifkan sebagai lapisan kedua: kalau suatu saat key publishable
-- bocor dan dipakai langsung dari browser, hasilnya tetap kosong, bukan data
-- tamu.

create table if not exists public.wall_cards (
	id uuid primary key default gen_random_uuid(),
	slug text not null,
	guest_name text not null check (char_length(guest_name) between 1 and 60),
	message text check (message is null or char_length(message) <= 280),
	photo_path text not null,
	thumb_path text not null,
	audio_path text,
	audio_duration_ms integer check (
		audio_duration_ms is null
		or (audio_duration_ms > 0 and audio_duration_ms <= 60000)
	),
	status text not null default 'published' check (status in ('published', 'hidden')),
	created_at timestamptz not null default now()
);

comment on table public.wall_cards is
	'Kartu photo wall undangan; diakses hanya dari server function (secret key).';
comment on column public.wall_cards.slug is
	'Slug tamu pemilik kartu, dipakai untuk rate limit dan atribusi.';
comment on column public.wall_cards.photo_path is
	'Path di bucket `wall`, mis. {id}/card.jpg.';

-- Daftar wall selalu "published terbaru dulu".
create index if not exists wall_cards_published_idx
	on public.wall_cards (created_at desc)
	where status = 'published';

-- Rate limit: hitung kartu per slug dalam rentang waktu.
create index if not exists wall_cards_slug_created_idx
	on public.wall_cards (slug, created_at desc);

alter table public.wall_cards enable row level security;

-- Bucket privat untuk foto & audio. Browser tidak pernah memegang key, hanya
-- menerima signed URL berumur pendek dari server function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'wall',
	'wall',
	false,
	1048576,
	array['image/jpeg', 'audio/webm', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do update
	set file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;
