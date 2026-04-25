// supabase/functions/org-splash/index.ts
//
// Branded PWA splash for the org-branded login PWA.
// GET /functions/v1/org-splash?slug={orgSlug}[&loc={locationId}]
//
// Renders a 1242x2688 PNG (iPhone 11 Pro Max — iOS scales for other devices)
// with the org logo centered on a black background. Mirrors the look of the
// terminal splash automation (terminal-splash-palettes.ts) but kept simple
// since iOS startup splashes don't render gradients reliably.
//
// Public, cached aggressively. Logo is fetched, decoded, and composited
// using imagescript (pure TS — no native canvas dep).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  Image,
  decode as decodeAny,
} from 'https://esm.sh/imagescript@1.3.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPLASH_W = 1242;
const SPLASH_H = 2688;
const LOGO_MAX = 520;

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

    // Fetch org → resolve logo
    const { data: org } = await supabase
      .from('organizations')
      .select('logo_url, name')
      .eq('slug', slug)
      .maybeSingle();

    // Black canvas — black is 0x000000ff in RGBA
    const canvas = new Image(SPLASH_W, SPLASH_H);
    canvas.fill(0x000000ff);

    // Composite logo (best-effort — silently fall back to plain black if logo
    // is missing, SVG, or fails to decode in Deno)
    if (org?.logo_url && !org.logo_url.toLowerCase().endsWith('.svg')) {
      try {
        const res = await fetch(org.logo_url);
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          const decoded = await decodeAny(buf);
          if (decoded && 'width' in decoded && 'height' in decoded) {
            const logo = decoded as Image;
            const scale = Math.min(LOGO_MAX / logo.width, LOGO_MAX / logo.height);
            const lw = Math.round(logo.width * scale);
            const lh = Math.round(logo.height * scale);
            const resized = logo.resize(lw, lh);
            const x = Math.round((SPLASH_W - lw) / 2);
            const y = Math.round((SPLASH_H - lh) / 2);
            canvas.composite(resized, x, y);
          }
        }
      } catch (err) {
        console.error('[org-splash] logo composite failed', err);
      }
    }

    const png = await canvas.encode(1);

    return new Response(png, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    console.error('[org-splash] error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
