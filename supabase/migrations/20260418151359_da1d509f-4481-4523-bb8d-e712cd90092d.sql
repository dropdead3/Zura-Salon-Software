-- Archive platform notifications older than 90 days
CREATE OR REPLACE FUNCTION public.archive_old_platform_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '90 days';
  v_archived_count integer := 0;
  v_oldest_remaining timestamptz;
BEGIN
  -- Move old rows to archive (preserving original id + created_at)
  WITH moved AS (
    DELETE FROM public.platform_notifications
    WHERE created_at < v_cutoff
    RETURNING id, type, severity, title, message, metadata, resolved_at, created_at
  )
  INSERT INTO public.archived_notifications (
    id, type, severity, title, message, metadata, resolved_at, created_at, archived_at
  )
  SELECT id, type, severity, title, message, metadata, resolved_at, created_at, now()
  FROM moved
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  SELECT MIN(created_at) INTO v_oldest_remaining
  FROM public.platform_notifications;

  RETURN jsonb_build_object(
    'archived_count', v_archived_count,
    'cutoff', v_cutoff,
    'oldest_remaining', v_oldest_remaining,
    'ran_at', now()
  );
END;
$$;

-- Daily 03:00 UTC retention sweep
SELECT cron.schedule(
  'archive-platform-notifications-daily',
  '0 3 * * *',
  $$ SELECT public.archive_old_platform_notifications(); $$
);