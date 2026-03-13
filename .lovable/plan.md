

# Expand Danger Jones to Individual Shade Variants

## Problem
The supply library currently lists Danger Jones product **lines** (e.g., "Artistic Toners") as single entries. The user needs every individual shade listed separately because each bottle/tube must be tracked and replaced individually in the backroom inventory.

## Scope of Change

**File:** `src/data/professional-supply-library.ts`

Replace the current 6 Danger Jones entries with individual shade entries. Based on research from the official Danger Jones website and retail sources:

### Gloss Toners with Bonder (20 shades, 60ml each)
0-0 Clear, 10-0 Natural, 10-03 Natural Gold, 10-1 Ash, 10-12 Ash Violet, 10-2 Violet, 10-32 Gold Violet, 5-0 Natural, 6-0 Natural, 6-01 Natural Ash, 7-0 Natural, 7-4 Copper, 7-8 Brown, 8-32 Gold Violet, 9-1 Ash, 9-12 Ash Violet, 9-2 Violet, 9-32 Gold Violet, 9-4 Copper, 9-8 Brown

Each entry: `{ brand: 'Danger Jones', name: 'Gloss Toner 10-1 Ash', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] }`

### Artistic Toners (3 shades, 90ml each)
Cool Blonde, Silver, Violet Blonde

Each entry: `{ brand: 'Danger Jones', name: 'Artistic Toner Cool Blonde', category: 'toner', ... sizeOptions: ['90ml'] }`

### Semi-Permanent Vivids (28 shades, 118ml each)
Dopamine (Black), Hustler (Pink), Lovesick (Neon Pink), Cheap Date (Light Pink), Antique (Rose Gold), Checkmate (Hot Red), Diablo (Red), Burnout (Orange), Hotwire (Neon Orange), Simpatico (Light Peach), Starrider (Yellow), Ray Gun (Neon Yellow), Empire (Green), Adrenaline (Neon Green), Ransom (Light Teal), Oblivion (Teal), Solitude (Blue), Cyclone (Silver), Poolside (Light Blue), Libertine (Violet), Masquerade (Purple), Hysteria (Berry), Exotica (Light Purple), Burlesque (Mauve), Pavement (Grey), Clear

Each entry: `{ brand: 'Danger Jones', name: 'Semi-Permanent Hustler (Pink)', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] }`

### Epilogue Permanent Color (84 shades, 60ml each)
Epilogue launched with 84 intermixable shades. The specific shade numbers aren't fully available from my research yet. Two options:
1. **Add a general "Epilogue Permanent Color" entry** and let users name the shade when they add it (current approach, keeps working)
2. **Add known shades** and expand later as the full chart becomes available

I'll keep the single "Epilogue Permanent Color" entry for now since it's a brand-new launch (March 2026) and the full 84-shade list isn't publicly enumerated yet. Users can add individual shades via the manual "Add Product" flow.

### Kept as-is (no individual shades needed)
- **Epilogue Permanent Color** — single entry, 60ml (84 shades, list not yet publicly available)
- **Epilogue Lightener** — single product, 450g/900g
- **Liquid Semi-Permanent** — single entry, 118ml (same shades as Semi-Permanent line, different format)

## Summary
Replace 6 Danger Jones entries with ~53 individual entries (20 Gloss Toners + 3 Artistic Toners + 26 Semi-Permanents + Epilogue color + Epilogue Lightener + Liquid Semi-Permanent + Developers).

Also add the missing **Deluxe Cream Developer** entries (used with both Artistic Toners and Epilogue):
- Deluxe Cream Developer 5 Vol (1.5%)
- Deluxe Cream Developer 10 Vol (3%)
- Deluxe Cream Developer 20 Vol (6%)
- Deluxe Cream Developer 30 Vol (9%)
- Deluxe Cream Developer 40 Vol (12%)
- Gloss Toner Developer 6 Vol (1.8%)

