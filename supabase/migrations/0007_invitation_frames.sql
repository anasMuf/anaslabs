-- Bucket overlay frame photobooth (PNG/WebP transparan).
--
-- Public-read agar canvas tamu bisa memuat gambar tanpa signed URL dan tanpa
-- membuat canvas "tainted" (CORS). Tidak ada policy SELECT untuk anon, jadi
-- objek tidak bisa di-list; path memakai UUID.

insert into storage.buckets (
	id,
	name,
	public,
	file_size_limit,
	allowed_mime_types
)
values (
	'invitation-frames',
	'invitation-frames',
	true,
	2097152,
	array['image/png', 'image/webp']
)
on conflict (id) do update
	set public = excluded.public,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;
