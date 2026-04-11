/**
 * Service name to category mapping utility
 * Maps Phorest service names to display categories for analytics
 */

// Pattern-based categorization for common service types
const CATEGORY_PATTERNS: { pattern: RegExp; category: string }[] = [
  // Blonding services
  { pattern: /balayage|highlight|foil|lightener|blonde|bleach|ombre|root smudge|baby lights|teasy lights/i, category: 'Blonding' },
  
  // Color services
  { pattern: /color|toner|glaze|gloss|demi|semi|permanent|root touch|retouch|touch.?up|grey.?blend|coverage|vivid|fashion color/i, category: 'Color' },
  
  // Haircut services
  { pattern: /haircut|cut|trim|bang|fringe|clipper|fade|taper|shape|layers/i, category: 'Haircut' },
  
  // Extensions
  { pattern: /extension|install|removal|move.?up|tape.?in|hand.?tied|weft|keratin bond|fusion/i, category: 'Extensions' },
  
  // Styling services
  { pattern: /blowout|blow.?dry|style|updo|braid|curl|wave|straighten|flat.?iron|event|wedding|bridal|formal/i, category: 'Styling' },
  
  // Treatment/Extras
  { pattern: /treatment|conditioning|deep.?condition|mask|olaplex|k18|repair|keratin treatment|smoothing|scalp/i, category: 'Extras' },
  
  // Consultation
  { pattern: /consult|consultation|assessment|new.?client/i, category: 'New Client Consultation' },
];

/**
 * Get the category for a service name
 * Uses pattern matching to categorize services
 */
export function getServiceCategory(serviceName: string | null): string {
  if (!serviceName) return 'Other';
  
  const normalizedName = serviceName.toLowerCase().trim();
  
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(normalizedName)) {
      return category;
    }
  }
  
  return 'Other';
}

/**
 * Default service categories for display
 */
export const SERVICE_CATEGORIES = [
  'Blonding',
  'Color',
  'Haircut',
  'Extensions',
  'Styling',
  'Extras',
  'New Client Consultation',
  'Other',
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

/**
 * Categories that NEVER need chemical/color tracking (even if name matches a keyword).
 * Extension installs, haircuts, styling, and consultations don't consume color products.
 */
export const NON_CHEMICAL_CATEGORIES = new Set<string>([
  'Haircut',
  'Haircuts',
  'Extensions',
  'Styling',
  'New Client Consultation',
]);

/**
 * Returns true if a service should be *suggested* for chemical tracking.
 * Combines the regex keyword match with a category exclusion list so that
 * haircuts, extension installs, styling, and consultations are never suggested.
 */
export function isSuggestedChemicalService(
  serviceName: string | null,
  serviceCategory?: string | null,
): boolean {
  // If the category is explicitly non-chemical, never suggest
  if (serviceCategory && NON_CHEMICAL_CATEGORIES.has(serviceCategory)) return false;
  return isColorOrChemicalService(serviceName, serviceCategory);
}

/**
 * Color/chemical service keywords — union of Blonding + Color categories
 * plus additional chemical-processing terms.
 */
const COLOR_CHEMICAL_PATTERN =
  /color|colour|toner|glaze|gloss|demi|semi|permanent|root touch|retouch|touch.?up|grey.?blend|coverage|vivid|fashion color|balayage|highlight|foil|lightener|blonde|bleach|ombre|root smudge|baby lights|teasy lights|chemical/i;

/**
 * Returns true if the given service name or category indicates a color/chemical service.
 * Consolidated single source of truth — use everywhere instead of inline keyword lists.
 */
export function isColorOrChemicalService(
  serviceName: string | null,
  serviceCategory?: string | null,
): boolean {
  if (!serviceName && !serviceCategory) return false;
  const combined = `${serviceName ?? ''} ${serviceCategory ?? ''}`.trim();
  return COLOR_CHEMICAL_PATTERN.test(combined);
}

/**
 * Extension product pattern — matches product names that are extension hardware/inventory
 * (e.g. "20 inch SuperWeft Extensions", "Tape-In Hair 18\"", "Hand Tied Weft")
 */
const EXTENSION_PRODUCT_PATTERN = /extension|weft|tape.?in|hand.?tied|keratin.?bond|fusion|beaded.?row|i.?tip|k.?tip|u.?tip|nano.?ring/i;

/**
 * Returns true if the given product/item name is an extension product.
 * Used to separate high-ticket extension hardware from standard retail metrics.
 */
export function isExtensionProduct(itemName: string | null): boolean {
  if (!itemName) return false;
  return EXTENSION_PRODUCT_PATTERN.test(itemName.trim());
}

/**
 * Gift card product pattern — matches gift cards, vouchers, certificates
 */
const GIFT_CARD_PRODUCT_PATTERN = /gift.?card|voucher|gift.?cert|gift.?certificate/i;

/**
 * Returns true if the given product/item name is a gift card.
 */
export function isGiftCardProduct(itemName: string | null): boolean {
  if (!itemName) return false;
  return GIFT_CARD_PRODUCT_PATTERN.test(itemName.trim());
}

/**
 * Merch product pattern — matches branded apparel and goods
 */
const MERCH_PRODUCT_PATTERN = /t.?shirt|\btee\b|\bhat\b|\bcap\b|beanie|hoodie|sweatshirt|tote|\bbag\b|sticker|patch|\bpin\b|keychain|apparel|merch|branded/i;

/**
 * Returns true if the given product/item name is a merch item (apparel & branded goods).
 */
export function isMerchProduct(itemName: string | null): boolean {
  if (!itemName) return false;
  return MERCH_PRODUCT_PATTERN.test(itemName.trim());
}

/**
 * Vish chemical charge pattern — matches Phorest "Vish Product Charge" items
 * that are actually service overage fees, not retail products.
 */
const VISH_CHARGE_PATTERN = /\bvish\b/i;

/**
 * Returns true if the given item is a Vish chemical fee masquerading as a product.
 * These should be treated as service revenue, not retail.
 */
export function isVishServiceCharge(itemName: string | null, itemType: string | null): boolean {
  if (!itemName || !itemType) return false;
  const type = itemType.toLowerCase();
  if (type !== 'product' && type !== 'retail') return false;
  return VISH_CHARGE_PATTERN.test(itemName.trim());
}

/**
 * Category colors for charts (matches the service category theme)
 */
export const CATEGORY_COLORS: Record<string, string> = {
  'Blonding': 'hsl(var(--chart-1))',
  'Color': 'hsl(var(--chart-2))',
  'Haircut': 'hsl(var(--chart-3))',
  'Extensions': 'hsl(var(--chart-4))',
  'Styling': 'hsl(var(--chart-5))',
  'Extras': 'hsl(var(--primary))',
  'New Client Consultation': 'hsl(var(--accent))',
  'Other': 'hsl(var(--muted-foreground))',
};
