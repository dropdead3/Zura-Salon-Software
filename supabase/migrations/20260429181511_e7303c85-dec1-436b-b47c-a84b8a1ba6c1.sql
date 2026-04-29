INSERT INTO public.sms_templates (template_key, name, message_body, description, variables, is_active)
VALUES (
  'stylist-reassignment-soft-notify',
  'Stylist reassignment soft-notify',
  'Hi {{first_name}}, {{archived_stylist}} is no longer with us. {{new_stylist}} will be taking great care of you — same level, same pricing. See you at your next visit! — {{org_name}}',
  'Sent to clients when their preferred stylist is archived and they are reassigned to a new stylist.',
  ARRAY['first_name','archived_stylist','new_stylist','org_name']::text[],
  true
)
ON CONFLICT (template_key) DO NOTHING;