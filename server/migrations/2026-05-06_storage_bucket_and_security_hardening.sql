-- =============================================================================
-- OfferFlow — storage bucket + security hardening
-- Date: 2026-05-06
-- Applied remotely via Supabase MCP migration:
--   storage_bucket_and_security_hardening_20260506_retry
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('resumes', 'resumes', false, 5242880)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload own resumes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can upload own resumes"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'resumes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can read own resumes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can read own resumes"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'resumes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own resumes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can update own resumes"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'resumes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
      WITH CHECK (
        bucket_id = 'resumes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own resumes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can delete own resumes"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'resumes'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
    $pol$;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMIT;
