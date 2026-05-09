-- Migration 017: gallery storage bucket
-- Public-read bucket for gallery photos. Write access is service-role only
-- (upload CLI uses the service key).
--
-- Folder layout:
--   gallery/{album-slug}/full/{filename}.jpg     ← 1600px wide, 85% JPEG
--   gallery/{album-slug}/thumb/{filename}.jpg    ← 400px wide, 80% JPEG
--
-- Albums are discovered by listing the top-level folders in the bucket at
-- read time. Photos within an album sort by filename.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,
  10 * 1024 * 1024,       -- 10 MB per file (our resize keeps everything well below)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public can READ everything in the bucket (images render on /gallery).
DROP POLICY IF EXISTS "gallery_public_read" ON storage.objects;
CREATE POLICY "gallery_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'gallery');

-- All writes (INSERT/UPDATE/DELETE) are service-role only.
-- The upload CLI uses the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No explicit write policies for 'anon' or 'authenticated'.
