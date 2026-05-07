-- =========================================================
-- BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- =========================================================
-- POLICIES: documentos
-- =========================================================
create policy "doc_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "doc_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "doc_owner_update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text );

-- =========================================================
-- POLICIES: avatars
-- =========================================================
create policy "avatars_public_read"
  on storage.objects for select using ( bucket_id = 'avatars' );

create policy "avatars_owner_write"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
