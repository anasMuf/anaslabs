-- Izinkan JPEG untuk background kartu photobooth.
--
-- Overlay tetap disarankan PNG/WebP karena butuh transparansi; picker overlay
-- di dashboard tetap membatasi ke dua format itu. Bucket sama supaya background
-- dan overlay memakai jalur upload yang sudah ada.

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
	array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
	set public = excluded.public,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;
