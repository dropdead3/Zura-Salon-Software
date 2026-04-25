// supabase/functions/org-manifest/index.ts
//
// Per-organization PWA manifest.
// GET /functions/v1/org-manifest?slug={orgSlug}
//
// Public endpoint (manifests must be publicly fetchable). Returns a
// `manifest+json` document so each org installs as its own app icon
// with their logo and name.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug, logo_url')
      .eq('slug', slug)
      .maybeSingle();

    if (!org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shortName = (org.name || slug).slice(0, 12);
    const icon = org.logo_url || '/icons/icon-512x512.png';

    const manifest = {
      name: org.name,
      short_name: shortName,
      description: `Sign in to ${org.name}`,
      start_url: `/org/${org.slug}/login`,
      scope: `/org/${org.slug}/`,
      display: 'standalone',
      orientation: 'any',
      background_color: '#0a0a0a',
      theme_color: '#0a0a0a',
      icons: [
        {
          src: icon,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: icon,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['business', 'productivity'],
    };

    return new Response(JSON.stringify(manifest), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[org-manifest] error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
