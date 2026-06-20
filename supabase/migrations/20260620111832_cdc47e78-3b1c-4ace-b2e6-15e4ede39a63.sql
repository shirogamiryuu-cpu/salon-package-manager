
-- Avatars: anyone signed in can read; users write to their own folder (folder = user id)
CREATE POLICY "avatars read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Package images: read by authenticated, write by admins
CREATE POLICY "pkg images read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'package-images');
CREATE POLICY "pkg images write admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'package-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "pkg images update admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'package-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "pkg images delete admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'package-images' AND public.has_role(auth.uid(),'admin'));
