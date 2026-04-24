-- Ensure the catch-photos bucket exists (no-op if already created via dashboard).
insert into storage.buckets (id, name, public)
values ('catch-photos', 'catch-photos', true)
on conflict (id) do nothing;

-- Public read: anyone can view catch photos (required for photo_url links to work).
create policy "catch-photos: public read"
on storage.objects for select
using (bucket_id = 'catch-photos');

-- Authenticated upload: users may only write into a folder matching their own user id.
-- Path format enforced by the app: <angler_id>/<timestamp>.<ext>
create policy "catch-photos: authenticated insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'catch-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to replace their own photos (upsert=false in app, but safe to have).
create policy "catch-photos: own update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'catch-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own photos.
create policy "catch-photos: own delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'catch-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
