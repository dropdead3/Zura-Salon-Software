/**
 * Professional Supply Library
 * 
 * Curated reference dataset of salon chemical/supply product lines
 * organized by brand. Used by the Backroom Product Catalog to let
 * salon owners quickly build their supply inventory.
 */

export interface SupplyLibraryItem {
  brand: string;
  name: string;
  category: 'color' | 'lightener' | 'developer' | 'toner' | 'bond builder' | 'treatment' | 'additive';
  defaultDepletion: 'weighed' | 'per_service' | 'manual' | 'per_pump';
  defaultUnit: 'g' | 'ml' | 'oz';
  sizeOptions?: string[];
}

export const SUPPLY_LIBRARY: SupplyLibraryItem[] = [
  // ── Schwarzkopf ──
  { brand: 'Schwarzkopf', name: 'Igora Royal Permanent Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '120ml'] },
  { brand: 'Schwarzkopf', name: 'Igora Royal Absolutes', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '120ml'] },
  { brand: 'Schwarzkopf', name: 'Igora Vibrance Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Schwarzkopf', name: 'TBPH (True Beautiful Honest)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Schwarzkopf', name: 'BlondMe Premium Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Schwarzkopf', name: 'BlondMe Bond Enforcing Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Schwarzkopf', name: 'Igora Vario Blond Plus', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Schwarzkopf', name: 'BlondMe Toning', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Schwarzkopf', name: 'Fibreplex Bond Treatment', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },

  // ── Wella ──
  { brand: 'Wella', name: 'Koleston Perfect Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '120ml'] },
  { brand: 'Wella', name: 'Koleston Perfect ME+', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '120ml'] },
  { brand: 'Wella', name: 'Color Touch Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Wella', name: 'Color Touch Plus', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Wella', name: 'Illumina Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Wella', name: 'Shinefinity Zero Lift Glaze', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Wella', name: 'Blondor Multi Blonde Powder', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g', '800g'] },
  { brand: 'Wella', name: 'Blondor Freelights', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g'] },
  { brand: 'Wella', name: 'BlondorPlex Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g', '800g'] },
  { brand: 'Wella', name: 'WellaFlex Bond Maker', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },

  // ── Redken ──
  { brand: 'Redken', name: 'Shades EQ Gloss', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Redken', name: 'Shades EQ Bonder Inside', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Redken', name: 'Cover Fusion Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Redken', name: 'Color Gels Lacquers', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Redken', name: 'Flash Lift Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Redken', name: 'Flash Lift Bonder Inside', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Redken', name: 'Blonde Idol High Lift', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Redken', name: 'pH-Bonder', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },

  // ── L'Oréal Professionnel ──
  { brand: "L'Oréal Professionnel", name: 'Majirel Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['50ml', '100ml'] },
  { brand: "L'Oréal Professionnel", name: 'Majirel Cool Cover', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['50ml', '100ml'] },
  { brand: "L'Oréal Professionnel", name: 'INOA Ammonia-Free', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: "L'Oréal Professionnel", name: 'Dia Light Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['50ml'] },
  { brand: "L'Oréal Professionnel", name: 'Dia Richesse', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['50ml'] },
  { brand: "L'Oréal Professionnel", name: 'Luo Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['50ml'] },
  { brand: "L'Oréal Professionnel", name: 'Blond Studio Multi-Techniques', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g', '900g'] },
  { brand: "L'Oréal Professionnel", name: 'Blond Studio Platinium Plus', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g', '900g'] },
  { brand: "L'Oréal Professionnel", name: 'Blond Studio Majimeches', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g'] },
  { brand: "L'Oréal Professionnel", name: 'Smartbond', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['125ml', '500ml'] },

  // ── Matrix ──
  { brand: 'Matrix', name: 'SoColor Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Matrix', name: 'SoColor Pre-Bonded', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Matrix', name: 'Color Sync Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Matrix', name: 'Color Sync Watercolors', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Matrix', name: 'Light Master Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Matrix', name: 'Light Master with Bonder', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Goldwell ──
  { brand: 'Goldwell', name: 'Topchic Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '250ml'] },
  { brand: 'Goldwell', name: 'Colorance Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '120ml'] },
  { brand: 'Goldwell', name: '@Pure Pigments', category: 'additive', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['50ml'] },
  { brand: 'Goldwell', name: 'Elumen High-Performance', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'ml', sizeOptions: ['200ml'] },
  { brand: 'Goldwell', name: 'Elumen Play Semi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['120ml'] },
  { brand: 'Goldwell', name: 'Silk Lift Control Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['500g'] },
  { brand: 'Goldwell', name: 'Silk Lift Strong Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['500g'] },
  { brand: 'Goldwell', name: 'BondPro+ System', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },

  // ── Pravana ──
  { brand: 'Pravana', name: 'ChromaSilk Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Pravana', name: 'ChromaSilk Express Tones', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Pravana', name: 'ChromaSilk Vivids', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Pravana', name: 'ChromaSilk Pastels', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Pravana', name: 'Pure Light Ultra Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Pravana', name: 'Pure Light Balayage Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g'] },

  // ── Joico ──
  { brand: 'Joico', name: 'Vero K-PAK Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['74ml'] },
  { brand: 'Joico', name: 'LumiShine Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['74ml'] },
  { brand: 'Joico', name: 'LumiShine Lumi10 Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['74ml'] },
  { brand: 'Joico', name: 'Blonde Life Lightening Powder', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Joico', name: 'Blonde Life Brightening Veil', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g'] },
  { brand: 'Joico', name: 'Defy Damage ProSeries Bond Treatment', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },

  // ── Paul Mitchell ──
  { brand: 'Paul Mitchell', name: 'The Color Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Paul Mitchell', name: 'The Color XG Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Paul Mitchell', name: 'Pop XG Vibrant Semi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['180ml'] },
  { brand: 'Paul Mitchell', name: 'The Demi Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Paul Mitchell', name: 'Blonde Life Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Paul Mitchell', name: 'SynchroLift Ultra-Quick Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Kenra ──
  { brand: 'Kenra', name: 'Kenra Color Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['85g'] },
  { brand: 'Kenra', name: 'Kenra Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['58g'] },
  { brand: 'Kenra', name: 'Simply Blonde Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Kenra', name: 'Simply Blonde Beyond Bond Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Kenra', name: 'Metallic Collection', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['85g'] },

  // ── Pulp Riot ──
  { brand: 'Pulp Riot', name: 'Faction8 Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['57g', '90g'] },
  { brand: 'Pulp Riot', name: 'Semi-Permanent Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Pulp Riot', name: 'Blank Canvas Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Pulp Riot', name: 'High Speed Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Pulp Riot', name: 'Liquid Demi Gloss', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'ml', sizeOptions: ['60ml'] },

  // ── Oligo ──
  { brand: 'Oligo', name: 'Blacklight Lightening Powder', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Oligo', name: 'Blacklight Smart Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Oligo', name: 'Blacklight Blue Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Oligo', name: 'Calura Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Oligo', name: 'Calura Gloss', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },

  // ── Guy Tang #mydentity ──
  { brand: '#mydentity', name: 'Permanent Shade', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['58g'] },
  { brand: '#mydentity', name: 'Demi-Permanent Shade', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['58g'] },
  { brand: '#mydentity', name: 'Super Power Direct Dye', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['85g'] },
  { brand: '#mydentity', name: '#Magicbleach Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── TIGI ──
  { brand: 'TIGI', name: 'Copyright Colour Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'TIGI', name: 'Copyright Colour Gloss', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'TIGI', name: 'Copyright Colour True Light', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'TIGI', name: 'Copyright Colour True Light White', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Framesi ──
  { brand: 'Framesi', name: 'Framcolor Futura Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Framesi', name: 'Framcolor Eclectic Demi', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Framesi', name: 'Decolor B Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Framesi', name: 'Decolor B Diamond Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Lakme ──
  { brand: 'Lakme', name: 'Collage Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Lakme', name: 'Gloss Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Lakme', name: 'K.Blonde Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g'] },
  { brand: 'Lakme', name: 'K.Blonde Compact Powder', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['400g'] },

  // ── Keune ──
  { brand: 'Keune', name: 'Tinta Color Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Keune', name: 'Semi Color Demi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Keune', name: 'So Pure Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Keune', name: 'Ultimate Blonde Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  { brand: 'Keune', name: 'Freedom Blonde Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Rusk ──
  { brand: 'Rusk', name: 'Deepshine Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['100ml'] },
  { brand: 'Rusk', name: 'Deepshine Demi Gloss', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['100ml'] },
  { brand: 'Rusk', name: 'Deepshine Pure Pigments', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['100ml'] },
  { brand: 'Rusk', name: 'Radical Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── CHI ──
  { brand: 'CHI', name: 'Ionic Permanent Shine', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['85g'] },
  { brand: 'CHI', name: 'Ionic Shine Shades', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['85g'] },
  { brand: 'CHI', name: 'Blondest Blonde Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Clairol Professional ──
  { brand: 'Clairol Professional', name: 'Liquicolor Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['59ml'] },
  { brand: 'Clairol Professional', name: 'Premium Creme Demi', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['59ml'] },
  { brand: 'Clairol Professional', name: 'BW2 Powder Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['227g', '454g', '907g'] },
  { brand: 'Clairol Professional', name: 'BW2+ Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['227g', '454g', '907g'] },

  // ── Elgon ──
  { brand: 'Elgon', name: 'I-Light Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Elgon', name: 'Moda & Styling Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Elgon', name: 'Decolorvit Plus Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },

  // ── Uberliss ──
  { brand: 'Uberliss', name: 'Bond Sustainer Treatment', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },
  { brand: 'Uberliss', name: 'Bond Preconditioner', category: 'treatment', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '500ml'] },

  // ── Olaplex ──
  { brand: 'Olaplex', name: 'No.1 Bond Multiplier', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '525ml'] },
  { brand: 'Olaplex', name: 'No.2 Bond Perfector', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['100ml', '525ml', '2000ml'] },
  { brand: 'Olaplex', name: 'No.0 Intensive Bond Builder', category: 'bond builder', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['155ml'] },

  // ── K18 ──
  { brand: 'K18', name: 'Professional Molecular Repair Service', category: 'treatment', defaultDepletion: 'per_pump', defaultUnit: 'ml', sizeOptions: ['150ml', '300ml'] },
  { brand: 'K18', name: 'Professional Molecular Repair Hair Mask', category: 'treatment', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['150ml', '300ml'] },

  // ── Danger Jones ──
  // Epilogue Permanent Color (single entry — 84 shades, full list not yet publicly available)
  { brand: 'Danger Jones', name: 'Epilogue Permanent Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  // Epilogue Lightener
  { brand: 'Danger Jones', name: 'Epilogue Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
  // Gloss Toners with Bonder (20 shades, 60ml)
  { brand: 'Danger Jones', name: 'Gloss Toner 0-0 Clear', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 5-0 Natural', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 6-0 Natural', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 6-01 Natural Ash', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 7-0 Natural', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 7-4 Copper', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 7-8 Brown', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 8-32 Gold Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 9-1 Ash', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 9-12 Ash Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 9-2 Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 9-32 Gold Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 9-4 Copper', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 9-8 Brown', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 10-0 Natural', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 10-03 Natural Gold', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 10-1 Ash', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 10-12 Ash Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 10-2 Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner 10-32 Gold Violet', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
  // Artistic Toners (3 shades, 90ml)
  { brand: 'Danger Jones', name: 'Artistic Toner Cool Blonde', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Danger Jones', name: 'Artistic Toner Silver', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  { brand: 'Danger Jones', name: 'Artistic Toner Violet Blonde', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
  // Semi-Permanent Vivids (26 shades, 118ml)
  { brand: 'Danger Jones', name: 'Semi-Permanent Dopamine (Black)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Hustler (Pink)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Lovesick (Neon Pink)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Cheap Date (Light Pink)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Antique (Rose Gold)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Checkmate (Hot Red)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Diablo (Red)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Burnout (Orange)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Hotwire (Neon Orange)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Simpatico (Light Peach)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Starrider (Yellow)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Ray Gun (Neon Yellow)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Empire (Green)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Adrenaline (Neon Green)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Ransom (Light Teal)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Oblivion (Teal)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Solitude (Blue)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Cyclone (Silver)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Poolside (Light Blue)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Libertine (Violet)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Masquerade (Purple)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Hysteria (Berry)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Exotica (Light Purple)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Burlesque (Mauve)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Pavement (Grey)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  { brand: 'Danger Jones', name: 'Semi-Permanent Clear', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
  // Liquid Semi-Permanent (same shades, different format)
  { brand: 'Danger Jones', name: 'Liquid Semi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'ml', sizeOptions: ['118ml'] },
  // Developers
  { brand: 'Danger Jones', name: 'Deluxe Cream Developer 5 Vol (1.5%)', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['900ml'] },
  { brand: 'Danger Jones', name: 'Deluxe Cream Developer 10 Vol (3%)', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['900ml'] },
  { brand: 'Danger Jones', name: 'Deluxe Cream Developer 20 Vol (6%)', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['900ml'] },
  { brand: 'Danger Jones', name: 'Deluxe Cream Developer 30 Vol (9%)', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['900ml'] },
  { brand: 'Danger Jones', name: 'Deluxe Cream Developer 40 Vol (12%)', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['900ml'] },
  { brand: 'Danger Jones', name: 'Gloss Toner Developer 6 Vol (1.8%)', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['900ml'] },

  // ── Generic Developers ──
  { brand: 'Generic Developer', name: '10 Volume (3%) Developer', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['500ml', '1000ml'] },
  { brand: 'Generic Developer', name: '20 Volume (6%) Developer', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['500ml', '1000ml'] },
  { brand: 'Generic Developer', name: '30 Volume (9%) Developer', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['500ml', '1000ml'] },
  { brand: 'Generic Developer', name: '40 Volume (12%) Developer', category: 'developer', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['500ml', '1000ml'] },
];

/**
 * Get unique brand names sorted alphabetically.
 */
export function getSupplyBrands(): string[] {
  return [...new Set(SUPPLY_LIBRARY.map((item) => item.brand))].sort();
}

/**
 * Get products for a specific brand.
 */
export function getProductsByBrand(brand: string): SupplyLibraryItem[] {
  return SUPPLY_LIBRARY.filter((item) => item.brand === brand);
}

/**
 * Get category display labels.
 */
export const SUPPLY_CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  lightener: 'Lightener / Bleach',
  developer: 'Developer',
  toner: 'Toner / Gloss',
  'bond builder': 'Bond Builder',
  treatment: 'Treatment',
  additive: 'Additive',
};
