-- Blast WhatsApp lewat Wablas.
--
-- Tiga kelompok tabel:
-- 1. `blast_channels` + `blast_templates` — kredensial device (terenkripsi) dan
--    pesan per mempelai. Token/secret TIDAK pernah disimpan plaintext.
-- 2. `blast_batches` + `wa_sends` — antrian dan riwayat percobaan kirim.
--    `sent` berarti Wablas menerima pesan (bukan bukti dibaca).
-- 3. `invitation_meta` — metadata Open Graph global yang bisa diedit.
--
-- Keputusan yang membentuk skema ini (lihat docs/invitation/blast.md):
-- - Kredensial disimpan AES-256-GCM di `blast_channels`; kunci diturunkan dari
--   DASHBOARD_SESSION_SECRET. Tidak ada token di browser/log.
-- - Identitas percobaan kirim adalah `ref_id` unik yang dikirim ke Wablas,
--   supaya response `data.messages[]` bisa dicocokkan kembali.
-- - Satu tamu tidak boleh punya dua baris aktif (`queued`/`sending`) agar blast
--   tidak dobel. Setelah `sent`/`failed`, kirim ulang membuat baris baru.
-- - Worker mengambil antrian dengan `FOR UPDATE SKIP LOCKED`, jadi dua worker
--   tidak akan memproses baris yang sama.

alter table public.guests
	add column if not exists blast_channel text
	check (blast_channel in ('anas', 'mila'));

comment on column public.guests.blast_channel is
	'Override nomor pengirim (anas/mila); NULL berarti ikut source_sheet.';

create table if not exists public.blast_channels (
	source text primary key check (source in ('anas', 'mila')),
	label text not null,
	base_url text not null default 'https://jogja.wablas.com',
	sender_phone text,
	device_id text,
	token_cipher text not null,
	secret_cipher text not null,
	enabled boolean not null default true,
	status text,
	quota integer,
	expires_on date,
	last_checked_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.blast_channels is
	'Kredensial device Wablas per mempelai; token/secret terenkripsi AES-256-GCM.';
comment on column public.blast_channels.base_url is
	'Server Wablas, mis. https://jogja.wablas.com. Token hanya valid di server device berada.';

create table if not exists public.blast_templates (
	source text primary key check (source in ('anas', 'mila')),
	body text not null,
	updated_at timestamptz not null default now()
);

comment on table public.blast_templates is
	'Template pesan WhatsApp per mempelai; variabel dirender server-side.';

create table if not exists public.invitation_meta (
	id text primary key default 'default' check (id = 'default'),
	og_title text,
	og_description text,
	og_image_url text,
	updated_at timestamptz not null default now()
);

comment on table public.invitation_meta is
	'Metadata Open Graph global; kolom NULL berarti memakai default undangan.';

create table if not exists public.blast_batches (
	id uuid primary key default gen_random_uuid(),
	source text not null check (source in ('anas', 'mila', 'all')),
	status text not null default 'queued'
		check (status in ('queued', 'running', 'completed', 'canceled')),
	total integer not null default 0,
	sent integer not null default 0,
	failed integer not null default 0,
	created_by text,
	created_at timestamptz not null default now(),
	finished_at timestamptz
);

comment on table public.blast_batches is
	'Satu klik "kirim massal" = satu batch; menghitung progres antrian.';

create table if not exists public.wa_sends (
	id uuid primary key default gen_random_uuid(),
	batch_id uuid references public.blast_batches(id) on delete set null,
	guest_id uuid references public.guests(id) on delete cascade,
	source text not null check (source in ('anas', 'mila')),
	phone text not null,
	message text not null,
	ref_id text not null unique,
	status text not null default 'queued'
		check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'canceled')),
	attempts integer not null default 0,
	wablas_message_id text,
	error text,
	available_at timestamptz not null default now(),
	queued_at timestamptz not null default now(),
	sent_at timestamptz,
	updated_at timestamptz not null default now()
);

comment on table public.wa_sends is
	'Riwayat/antrian kirim; sent = diterima Wablas, bukan bukti dibaca.';

-- Satu tamu hanya boleh punya satu percobaan yang belum selesai.
create unique index if not exists wa_sends_active_guest_idx
	on public.wa_sends (guest_id)
	where status in ('queued', 'sending');

-- Worker memilih baris yang sudah waktunya dicoba.
create index if not exists wa_sends_queue_idx
	on public.wa_sends (status, available_at);

create index if not exists blast_batches_created_idx
	on public.blast_batches (created_at desc);

alter table public.blast_channels enable row level security;
alter table public.blast_templates enable row level security;
alter table public.invitation_meta enable row level security;
alter table public.blast_batches enable row level security;
alter table public.wa_sends enable row level security;

-- Klaim atomik: worker mengubah sekumpulan baris queued menjadi sending dalam
-- satu statement, melewati baris yang sedang dikunci worker lain.
create or replace function public.claim_blast_sends(p_limit int, p_source text default null)
returns setof public.wa_sends
language sql
security definer
set search_path = public
as $$
	update public.wa_sends s
	set status = 'sending', attempts = s.attempts + 1, updated_at = now()
	where s.id in (
		select id from public.wa_sends
		where status = 'queued'
		  and available_at <= now()
		  and (p_source is null or source = p_source)
		order by available_at
		limit greatest(p_limit, 0)
		for update skip locked
	)
	returning s.*;
$$;

revoke all on function public.claim_blast_sends(int, text) from public, anon, authenticated;
grant execute on function public.claim_blast_sends(int, text) to service_role;
