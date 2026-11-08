-- Storage API'de silme, okuma yetkisi de ister: kullanıcı kendi klasörünü listeleyip silebilsin.
create policy "foto listele (kendi klasörü)" on storage.objects for select to authenticated
  using (bucket_id = 'ilan-fotolari' and (storage.foldername(name))[1] = auth.uid()::text);
