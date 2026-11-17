-- Siapa saja yang boleh membuka /dashboard.
--
-- Kredensial (email + password) dikelola Supabase Auth; tabel ini hanya
-- gerbang akses, jadi menghapus satu baris = mencabut akses tanpa menyentuh
-- password atau env.
--
-- Isi dengan email Anda berdua, contoh:
--   insert into public.dashboard_users (email) values
--     ('nama1@gmail.com'),
--     ('nama2@gmail.com')
--   on conflict (email) do nothing;

create table if not exists public.dashboard_users (
	email text primary key,
	created_at timestamptz not null default now()
);

comment on table public.dashboard_users is
	'Akses dashboard undangan; kredensial tetap di Supabase Auth.';

-- RLS aktif tanpa policy: tabel hanya dibaca/ditulis lewat server function
-- dengan secret key, seperti wall_cards.
alter table public.dashboard_users enable row level security;
