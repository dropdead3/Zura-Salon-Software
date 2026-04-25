// supabase/functions/org-splash/index.ts
//
// Branded PWA splash for the org-branded login PWA.
// GET /functions/v1/org-splash?slug={orgSlug}
//
// Returns an SVG splash (1242x2688 viewBox — iOS scales for any device) with
// the org logo centered on a black background. SVG is used instead of a
// rasterized PNG so the function has zero native/binary deps and bundles
// reliably in the edge runtime. Safari accepts SVG for
// `apple-touch-startup-image`.

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: org } = await supabase
      .from('organizations')
      .select('logo_url, name')
      .eq('slug', slug)
      .maybeSingle();

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
