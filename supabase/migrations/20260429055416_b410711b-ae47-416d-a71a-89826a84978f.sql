UPDATE public.ai_capabilities
SET required_permission = NULL
WHERE id IN ('team.deactivate_member','team.reactivate_member');

UPDATE public.ai_capabilities
SET required_permission = 'create_appointments'
WHERE id IN ('appointments.reschedule','appointments.cancel');