-- Fix appointments incorrectly marked as completed due to UTC timezone bug
-- Reset to 'booked' for today's future appointments and all future-dated appointments
UPDATE public.phorest_appointments 
SET status = 'booked', updated_at = now()
WHERE status = 'completed'
  AND (
    -- Future dates: definitely not completed
    appointment_date > CURRENT_DATE
    OR
    -- Today but end time hasn't passed yet
    (appointment_date = CURRENT_DATE AND end_time::time > CURRENT_TIME)
  );