-- Replace create_break_request to write native breaks/blocks to staff_schedule_blocks
-- (the canonical overlay table) instead of duplicating them as appointments.
-- Also materialize a block when an admin approves a pending request.

CREATE OR REPLACE FUNCTION public.create_break_request(
  p_user_id uuid,
  p_organization_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time time without time zone DEFAULT NULL::time without time zone,
  p_end_time time without time zone DEFAULT NULL::time without time zone,
  p_is_full_day boolean DEFAULT true,
  p_reason text DEFAULT 'break'::text,
  p_notes text DEFAULT NULL::text,
  p_blocks_online_booking boolean DEFAULT true,
  p_block_mode text DEFAULT 'Block'::text
)
 RETURNS TABLE(request_id uuid, status text, appointment_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requires_approval BOOLEAN;
  v_status TEXT;
  v_request_id UUID;
  v_caller_id UUID;
  v_location_id UUID;
  v_effective_block_mode TEXT;
  v_block_type TEXT;
  v_label TEXT;
BEGIN
  v_caller_id := auth.uid();

  -- Validate block_mode (UI sends 'Break' or 'Block')
  v_effective_block_mode := CASE
    WHEN p_block_mode IN ('Break', 'Block') THEN p_block_mode
    ELSE 'Block'
  END;

  -- Verify caller is the target user OR an admin/manager/super_admin
  IF v_caller_id != p_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller_id
      AND role IN ('admin', 'manager', 'super_admin')
    ) AND NOT EXISTS (
      SELECT 1 FROM public.employee_profiles
      WHERE user_id = v_caller_id
      AND is_super_admin = true
    ) THEN
      RAISE EXCEPTION 'Only admins/managers can create breaks for other users';
    END IF;
  END IF;

  -- Org-level approval setting
  SELECT time_off_requires_approval INTO v_requires_approval
  FROM public.organizations WHERE id = p_organization_id;

  v_status := CASE WHEN v_requires_approval THEN 'pending' ELSE 'approved' END;

  -- Insert the time-off / break record (always)
  INSERT INTO public.time_off_requests (
    user_id, organization_id, start_date, end_date, start_time, end_time,
    is_full_day, reason, notes, status, blocks_online_booking
  ) VALUES (
    p_user_id, p_organization_id, p_start_date, p_end_date, p_start_time, p_end_time,
    p_is_full_day, p_reason, p_notes, v_status, p_blocks_online_booking
  )
  RETURNING id INTO v_request_id;

  -- If auto-approved AND scoped to a time window (not full-day), materialize
  -- a row in staff_schedule_blocks so the schedule renders the overlay chip.
  IF v_status = 'approved' AND NOT p_is_full_day AND p_start_time IS NOT NULL AND p_end_time IS NOT NULL THEN
    SELECT (location_ids[1])::uuid INTO v_location_id
    FROM public.employee_profiles
    WHERE user_id = p_user_id
    LIMIT 1;

    -- Map UI mode → canonical block_type
    -- Break + 'lunch' reason gets the 'lunch' type for distinct labeling.
    v_block_type := CASE
      WHEN v_effective_block_mode = 'Break' AND lower(p_reason) = 'lunch' THEN 'lunch'
      WHEN v_effective_block_mode = 'Break' THEN 'break'
      ELSE 'block'
    END;

    v_label := INITCAP(REPLACE(p_reason, '_', ' '));

    INSERT INTO public.staff_schedule_blocks (
      user_id, location_id, organization_id,
      block_date, start_time, end_time,
      block_type, label, source
    ) VALUES (
      p_user_id, v_location_id, p_organization_id,
      p_start_date, p_start_time, p_end_time,
      v_block_type, v_label, 'zura'
    );
  END IF;

  request_id := v_request_id;
  status := v_status;
  appointment_id := NULL;
  RETURN NEXT;
END;
$function$;


-- Trigger: when a pending time_off_request is approved, materialize the overlay row
CREATE OR REPLACE FUNCTION public.materialize_block_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_location_id UUID;
  v_block_type TEXT;
  v_label TEXT;
BEGIN
  -- Only act on pending → approved transition with a time window
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.is_full_day = false
     AND NEW.start_time IS NOT NULL
     AND NEW.end_time IS NOT NULL THEN

    -- Skip if a block already exists for this user/date/window
    IF EXISTS (
      SELECT 1 FROM public.staff_schedule_blocks
      WHERE user_id = NEW.user_id
        AND block_date = NEW.start_date
        AND start_time = NEW.start_time
        AND end_time = NEW.end_time
    ) THEN
      RETURN NEW;
    END IF;

    SELECT (location_ids[1])::uuid INTO v_location_id
    FROM public.employee_profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;

    -- Infer block_type from reason. 'lunch' is its own type for label clarity.
    v_block_type := CASE
      WHEN lower(NEW.reason) IN ('lunch') THEN 'lunch'
      WHEN lower(NEW.reason) IN ('rest_break', 'personal_break', 'break') THEN 'break'
      ELSE 'block'
    END;

    v_label := INITCAP(REPLACE(NEW.reason, '_', ' '));

    INSERT INTO public.staff_schedule_blocks (
      user_id, location_id, organization_id,
      block_date, start_time, end_time,
      block_type, label, source
    ) VALUES (
      NEW.user_id, v_location_id, NEW.organization_id,
      NEW.start_date, NEW.start_time, NEW.end_time,
      v_block_type, v_label, 'zura'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_materialize_block_on_approval ON public.time_off_requests;
CREATE TRIGGER trg_materialize_block_on_approval
AFTER UPDATE ON public.time_off_requests
FOR EACH ROW
EXECUTE FUNCTION public.materialize_block_on_approval();


-- Cleanup: remove legacy duplicate appointment rows that the old RPC inserted.
-- These were the dark filled cards that should have been overlay chips.
DELETE FROM public.appointments
WHERE import_source = 'time_off'
  AND service_category IN ('Break', 'Block');