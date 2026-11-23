-- Bucket untuk audio undangan.
--
-- Public-read supaya file bisa diputar langsung oleh <audio>/streaming tanpa
-- signed URL yang kedaluwarsa. Tidak ada policy SELECT untuk anon, jadi objek
-- tidak bisa di-list lewat API; path memakai UUID sehingga tidak mudah ditebak.
-- Upload hanya lewat signed upload URL yang dibuat server (service key).

insert into storage.buckets (
	id,
	name,
	public,
	file_size_limit,
	allowed_mime_types
)
values (
	'invitation-media',
	'invitation-media',
	true,
	15728640,
	array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav']
)
on conflict (id) do update
	set public = excluded.public,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;
