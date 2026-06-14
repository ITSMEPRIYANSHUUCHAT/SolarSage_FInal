-- SEC-01: privatize the `pdfs` bucket and scope object access to the owning user.
-- Objects are written by the upload-pdf function under `<user_id>/<timestamp>_<name>`.
-- Access to a private object then requires a signed URL or service-role read.

-- 1. Make the bucket private (was public=true).
UPDATE storage.buckets SET public = false WHERE id = 'pdfs';

-- 2. Drop the old world-open policies.
DROP POLICY IF EXISTS "Allow public PDF uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public PDF access" ON storage.objects;

-- 3. Per-user policies: a user may only touch objects whose first path segment
--    is their own auth uid. (storage.foldername()[1] = top-level folder.)
CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Note: the upload-pdf edge function uses the service-role key, which bypasses
-- these policies for the write; the policies protect any direct client access.
