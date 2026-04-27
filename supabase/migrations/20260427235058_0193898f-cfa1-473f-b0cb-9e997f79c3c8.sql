UPDATE public.dashboard_layout_templates
SET layout = jsonb_set(
  jsonb_set(
    layout,
    '{sections}',
    COALESCE(layout->'sections', '[]'::jsonb) - 'team_dashboards'
  ),
  '{sectionOrder}',
  COALESCE(layout->'sectionOrder', '[]'::jsonb) - 'team_dashboards'
)
WHERE (layout->'sections') @> '["team_dashboards"]'::jsonb
   OR (layout->'sectionOrder') @> '["team_dashboards"]'::jsonb;