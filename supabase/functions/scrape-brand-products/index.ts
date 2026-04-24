const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapedProduct {
  name: string;
  category: string;
  product_line: string;
  sizes: string[];
  confidence: 'high' | 'medium' | 'low';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, brandName, maxPages } = await req.json();

    if (!websiteUrl || !brandName) {
      return new Response(
        JSON.stringify({ success: false, error: 'websiteUrl and brandName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in Settings → Connectors.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Step 1: Map the site to discover product/catalog URLs
    console.log('Step 1: Mapping site:', formattedUrl);
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        search: 'products color shade catalog professional',
        limit: 50,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapResponse.json();
    if (!mapResponse.ok) {
      console.error('Map failed:', mapData);
      return new Response(
        JSON.stringify({ success: false, error: `Site mapping failed: ${mapData.error || mapResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allLinks: string[] = mapData.links || [];
    console.log(`Found ${allLinks.length} URLs`);

    // Filter for product-relevant pages
    const productKeywords = ['product', 'color', 'shade', 'catalog', 'professional', 'range', 'collection', 'hair-color', 'haircolor', 'developer', 'lightener', 'treatment'];
    const relevantLinks = allLinks.filter((link: string) => {
      const lower = link.toLowerCase();
      return productKeywords.some((kw: any) => lower.includes(kw));
    });

    // Take the top N pages
    const pagesToScrape = (relevantLinks.length > 0 ? relevantLinks : allLinks).slice(0, maxPages || 8);
    console.log(`Scraping ${pagesToScrape.length} pages`);

    if (pagesToScrape.length === 0) {
      return new Response(
        JSON.stringify({ success: true, products: [], pagesScraped: 0, confidence: 'low' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Scrape the product pages
    console.log('Step 2: Scraping product pages');
    const scrapePromises = pagesToScrape.map(async (url: string) => {
      try {
        const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) return null;
        return data.data?.markdown || data.markdown || '';
      } catch {
        return null;
      }
    });

    const scrapeResults = await Promise.all(scrapePromises);
    const combinedMarkdown = scrapeResults
      .filter((r): r is string => !!r && r.length > 50)
      .join('\n\n---PAGE BREAK---\n\n');

    if (!combinedMarkdown) {
      return new Response(
        JSON.stringify({ success: true, products: [], pagesScraped: 0, confidence: 'low' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate to ~60k chars to stay within token limits
    const truncated = combinedMarkdown.slice(0, 60000);
    const pagesScraped = scrapeResults.filter(Boolean).length;

    // Step 3: AI extraction via Lovable AI Gateway
    console.log('Step 3: AI extraction from', pagesScraped, 'pages');
    const systemPrompt = `You are a professional salon product data extractor. You analyze website content from hair care brand "${brandName}" and extract structured product information.

Focus on professional salon products: hair color, developers, lighteners, toners, bond builders, treatments, and additives.

For each product found, determine:
- name: The full product name (e.g. "IGORA ROYAL 6-0")
- category: One of: color, developer, lightener, toner, bond builder, treatment, additive, styling, care
- product_line: The product line/range name (e.g. "IGORA ROYAL", "Color Touch", "Shades EQ")
- sizes: Array of size options if mentioned (e.g. ["60ml", "120ml"])
- confidence: "high" if clearly a professional salon product, "medium" if likely, "low" if uncertain

Rules:
- Only include professional/salon products, not consumer retail products
- Group shade variants under the product line, don't list each shade as separate product
- For color ranges, the product_line IS the range name, individual shades are NOT separate products
- Include one entry per product line + category combination
- Be conservative: if unsure whether something is a professional product, mark confidence as "low"`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract all professional salon products from this ${brandName} website content:\n\n${truncated}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_products',
            description: 'Return the list of extracted professional salon products',
            parameters: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Full product name or product line name' },
                      category: { type: 'string', enum: ['color', 'developer', 'lightener', 'toner', 'bond builder', 'treatment', 'additive', 'styling', 'care'] },
                      product_line: { type: 'string', description: 'Product line/range name' },
                      sizes: { type: 'array', items: { type: 'string' }, description: 'Available sizes' },
                      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                    },
                    required: ['name', 'category', 'product_line', 'confidence'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['products'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_products' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits depleted. Please add credits in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResponse.text();
      console.error('AI extraction failed:', aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let products: ScrapedProduct[] = [];

    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        products = (parsed.products || []).map((p: any) => ({
          name: p.name || '',
          category: p.category || 'color',
          product_line: p.product_line || '',
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          confidence: p.confidence || 'medium',
        }));
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    products = products.filter((p: any) => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`Extracted ${products.length} products from ${pagesScraped} pages`);

    return new Response(
      JSON.stringify({
        success: true,
        products,
        pagesScraped,
        totalUrlsFound: allLinks.length,
        confidence: products.length > 5 ? 'high' : products.length > 0 ? 'medium' : 'low',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-brand-products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape brand products';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
