-- Drop the persisted hide_numbers preference. Hide-numbers is now a session-only
-- privacy fence held in React state. Re-login or new tab re-blurs by default.
ALTER TABLE public.employee_profiles DROP COLUMN IF EXISTS hide_numbers;