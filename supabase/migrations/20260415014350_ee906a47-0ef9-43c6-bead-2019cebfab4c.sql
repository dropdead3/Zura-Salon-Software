CREATE OR REPLACE VIEW public.v_all_staff_qualifications AS
-- From phorest_staff_services (synced)
SELECT
  psm.user_id AS staff_user_id,
  pss.phorest_staff_id,
  pss.phorest_service_id AS service_external_id,
  vs.id AS service_id,
  pss.phorest_branch_id AS branch_id,
  pss.is_qualified,
  'phorest' AS _source
FROM phorest_staff_services pss
JOIN phorest_staff_mapping psm ON psm.phorest_staff_id = pss.phorest_staff_id
LEFT JOIN services vs ON vs.name = (
  SELECT ps.name FROM phorest_services ps WHERE ps.phorest_service_id = pss.phorest_service_id LIMIT 1
)
WHERE pss.is_qualified = true

UNION ALL

-- From staff_service_qualifications (native)
SELECT
  ssq.user_id AS staff_user_id,
  NULL AS phorest_staff_id,
  NULL AS service_external_id,
  ssq.service_id,
  NULL AS branch_id,
  ssq.is_active AS is_qualified,
  'native' AS _source
FROM staff_service_qualifications ssq
WHERE ssq.is_active = true;