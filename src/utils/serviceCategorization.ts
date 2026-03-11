/**
 * Service name to category mapping utility
 * Maps Phorest service names to display categories for analytics
 */

// Pattern-based categorization for common service types
const CATEGORY_PATTERNS: { pattern: RegExp; category: string }[] = [
  // Blonding services
  { pattern: /balayage|highlight|foil|lightener|blonde|bleach|ombre|root smudge|baby lights|teasy lights/i, category: 'Blonding' },
  
  // Color services
  { pattern: /color|toner|glaze|gloss|demi|semi|permanent|root touch|grey.?blend|coverage|vivid|fashion color/i, category: 'Color' },
  
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
