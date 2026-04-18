SELECT cron.schedule(
  'sync-phorest-far-future-hourly',
  '5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://vciqmwzgfjxtzagaxgnh.supabase.co/functions/v1/sync-phorest-data',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaXFtd3pnZmp4dHphZ2F4Z25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MTU5MjEsImV4cCI6MjA4NDI5MTkyMX0.agRGhYJ9hkdpX1US0DFjmsWlhZeIPfFZEhatrXgqUYA"}'::jsonb,
      body := '{"sync_type": "appointments", "quick": "far"}'::jsonb
    ) AS request_id;
  $$
);