import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePublicOrg } from '@/contexts/PublicOrgContext';
import { usePublicProducts, usePublicProductCategories, usePublicProductBrands } from '@/hooks/usePublicProducts';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { ShopLayout } from '@/components/shop/ShopLayout';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { ProductDetailModal } from '@/components/shop/ProductDetailModal';
import { Layout } from '@/components/layout/Layout';
import { Loader2, ShoppingBag, StoreIcon } from 'lucide-react';
import type { Product } from '@/hooks/useProducts';
import type { WebsiteRetailThemeSettings } from '@/hooks/useWebsiteSettings';

interface RetailSettings {
  enabled: boolean;
  continue_selling_when_out_of_stock?: boolean;
  [key: string]: unknown;
}

// Google Fonts that aren't loaded by default
const GOOGLE_FONTS = ['Inter', 'Playfair Display', 'DM Sans', 'Cormorant Garamond', 'Montserrat', 'Lora'];

function useRetailTheme() {
  const [searchParams] = useSearchParams();
  const { data: savedTheme } = useSiteSettings<WebsiteRetailThemeSettings>('website_retail_theme');

  return useMemo(() => {
    // Check for preview override first
    const previewParam = searchParams.get('preview_theme');
    if (previewParam) {
      try {
        return JSON.parse(atob(previewParam)) as WebsiteRetailThemeSettings;
      } catch { /* fall through */ }
    }
    return savedTheme ?? null;
  }, [searchParams, savedTheme]);
}

function useLoadGoogleFont(fontName: string | undefined) {
  useEffect(() => {
    if (!fontName || !GOOGLE_FONTS.includes(fontName)) return;
    const id = `gfont-${fontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [fontName]);
}

export default function Shop() {
  const { organization } = usePublicOrg();
  const { data: retailSettings, isLoading: loadingSettings } = useSiteSettings<RetailSettings>('website_retail');
  const theme = useRetailTheme();

  const [fullWebsiteEnabled] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Load Google Fonts if needed
  useLoadGoogleFont(theme?.heading_font);
  useLoadGoogleFont(theme?.body_font);

  const { data: products, isLoading: loadingProducts } = usePublicProducts({
    organizationId: organization.id,
    search,
    category,
    brand,
  });
  const { data: categories = [] } = usePublicProductCategories(organization.id);
  const { data: brands = [] } = usePublicProductBrands(organization.id);

  const isLoading = loadingSettings || loadingProducts;
  const storeEnabled = retailSettings?.enabled ?? false;
  const continueSelling = retailSettings?.continue_selling_when_out_of_stock ?? false;

  // Build CSS variable overrides from theme
  const themeStyle = useMemo(() => {
    if (!theme?.custom_colors) return undefined;
    const style: Record<string, string> = {};
    const c = theme.custom_colors;
    if (c.primary) style['--primary'] = c.primary;
    if (c.background) style['--background'] = c.background;
    if (c.card) style['--card'] = c.card;
    if (c.foreground) style['--foreground'] = c.foreground;
    if (theme.heading_font) style['--font-display'] = `"${theme.heading_font}", sans-serif`;
    if (theme.body_font) style['--font-sans'] = `"${theme.body_font}", sans-serif`;
    return style;
  }, [theme]);

  const content = (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
      style={themeStyle as React.CSSProperties}
    >
      {/* Store header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-xs font-medium mb-4">
          <ShoppingBag className="w-3.5 h-3.5" />
          Online Store
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-foreground mb-2">
          Shop Our Products
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Browse our curated selection of professional products, handpicked by our team.
        </p>
      </div>

      {/* Store unavailable */}
      {!isLoading && !storeEnabled && (
        <div className="text-center py-16">
          <StoreIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">Store Unavailable</h2>
          <p className="text-sm text-muted-foreground">This salon's online store is not currently active.</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Store content */}
      {!isLoading && storeEnabled && (
        <>
          <ProductFilters
            search={search}
            onSearchChange={setSearch}
            categories={categories}
            selectedCategory={category}
            onCategoryChange={setCategory}
            brands={brands}
            selectedBrand={brand}
            onBrandChange={setBrand}
          />

          {products && products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={setSelectedProduct}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-6">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <div className="text-center py-16 mt-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">No Products Available</h2>
              <p className="text-sm text-muted-foreground">
                {search || category !== 'all' || brand !== 'all'
                  ? 'No products match your filters. Try adjusting your search.'
                  : 'Check back soon — new products are on the way.'}
              </p>
            </div>
          )}

          <ProductDetailModal
            product={selectedProduct}
            open={!!selectedProduct}
            onOpenChange={(open) => !open && setSelectedProduct(null)}
          />
        </>
      )}
    </div>
  );

  if (fullWebsiteEnabled) {
    return <Layout>{content}</Layout>;
  }

  return (
    <ShopLayout fullWebsiteEnabled={false} theme={theme}>
      {content}
    </ShopLayout>
  );
}
