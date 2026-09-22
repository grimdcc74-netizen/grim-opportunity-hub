insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "materials_files_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "materials_files_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "materials_files_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "materials_files_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
