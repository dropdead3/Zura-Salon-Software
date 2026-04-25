// supabase/functions/org-splash/index.ts
//
// Branded PWA splash for the org-branded login PWA.
// GET /functions/v1/org-splash?slug={orgSlug}
//
// Strategy:
//   1. If a cached raster exists in the `org-splash-cache` bucket
//      (`{orgId}.jpg` or `.png`), 302-redirect to it. Owners generate this
//      via the "Generate PWA splash" button in Brand Assets.
//   2. Otherwise return an inline SVG with the logo (or org name) centered
//      on black. SVG is iOS-friendly and zero-binary-deps in edge runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPLASH_W = 1242;
const SPLASH_H = 2688;
const LOGO_MAX = 520;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      return new Response('Invalid slug', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: org } = await supabase
      .from('organizations')
      .select('id, logo_url, name')
      .eq('slug', slug)
      .maybeSingle();

    // ─── 1. Cached raster fallback (Chrome/Edge/Firefox PWAs) ──────
    if (org?.id) {
      for (const ext of ['jpg', 'png']) {
        const cachedUrl = `${supabaseUrl}/storage/v1/object/public/org-splash-cache/${org.id}.${ext}`;
        const headRes = await fetch(cachedUrl, { method: 'HEAD' });
        if (headRes.ok) {
          const v = url.searchParams.get('v') ?? '';
          const target = v ? `${cachedUrl}?v=${encodeURIComponent(v)}` : cachedUrl;
          return new Response(null, {
            status: 302,
            headers: {
              ...corsHeaders,
              Location: target,
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      }
    }

    const cx = SPLASH_W / 2;
    const cy = SPLASH_H / 2;
    const logoHalf = LOGO_MAX / 2;

    let logoMarkup = '';
    if (org?.logo_url) {
      const safeUrl = escapeXml(org.logo_url);
      logoMarkup = `<image href="${safeUrl}" x="${cx - logoHalf}" y="${cy - logoHalf}" width="${LOGO_MAX}" height="${LOGO_MAX}" preserveAspectRatio="xMidYMid meet" />`;
    } else if (org?.name) {
      logoMarkup = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="-apple-system, system-ui, sans-serif" font-size="72" font-weight="500" letter-spacing="6">${escapeXml(org.name.toUpperCase())}</text>`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${SPLASH_W} ${SPLASH_H}" width="${SPLASH_W}" height="${SPLASH_H}">
  <rect width="100%" height="100%" fill="#000000" />
  ${logoMarkup}
</svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    console.error('[org-splash] error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
