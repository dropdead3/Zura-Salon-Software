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
    const loc = url.searchParams.get('loc');

    // Slug: org subdomain shape (lowercase alphanumeric + hyphen).
    if (!slug || !/^[a-z0-9-]{1,64}$/i.test(slug)) {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // `loc` is a UUID by contract — matches App.tsx route param :locationId
    // which is the locations.id PK. Strict regex prevents loose params from
    // hitting Postgres and documents the contract explicitly.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (loc && !UUID_RE.test(loc)) {
      return new Response(JSON.stringify({ error: 'Invalid loc' }), {
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
      .select('id, name, slug, logo_url')
      .eq('slug', slug)
      .maybeSingle();

    if (!org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let locName: string | null = null;
    if (loc) {
      const { data: location } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', org.id)
        .eq('id', loc)
        .maybeSingle();
      if (location) locName = location.name;
    }

    const displayName = locName ? `${org.name} · ${locName}` : org.name;
    const shortName = (locName ?? org.name ?? slug).slice(0, 12);
    const icon = org.logo_url || '/icons/icon-512x512.png';
    const startUrl = loc ? `/org/${org.slug}/loc/${loc}/login` : `/org/${org.slug}/login`;
    const scope = loc ? `/org/${org.slug}/loc/${loc}/` : `/org/${org.slug}/`;

    const manifest = {
      name: displayName,
      short_name: shortName,
      description: `Sign in to ${displayName}`,
      start_url: startUrl,
      scope,
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
