

# Fix: Danger Jones Product Data in Supply Library

## File: `src/data/professional-supply-library.ts`

### Current entries (lines 194–197):
```ts
{ brand: 'Danger Jones', name: 'Epilogue Permanent Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml', '120ml'] },
{ brand: 'Danger Jones', name: 'Epilogue Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
{ brand: 'Danger Jones', name: 'Semi-Permanent Vivids', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
{ brand: 'Danger Jones', name: 'Liquid Semi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'ml', sizeOptions: ['118ml'] },
```

### Proposed changes:
1. **Epilogue Permanent Color** — update sizes to `['60ml']` (remove unverified 120ml) unless you confirm it exists
2. **Add Artistic Toners** — `90ml`, category `toner`, weighed in grams
3. **Add Gloss Toners with Bonder** — `60ml`, category `toner`, weighed in grams

```ts
{ brand: 'Danger Jones', name: 'Epilogue Permanent Color', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
{ brand: 'Danger Jones', name: 'Epilogue Lightener', category: 'lightener', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['450g', '900g'] },
{ brand: 'Danger Jones', name: 'Artistic Toners', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['90ml'] },
{ brand: 'Danger Jones', name: 'Gloss Toners with Bonder', category: 'toner', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
{ brand: 'Danger Jones', name: 'Semi-Permanent Vivids', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['118ml'] },
{ brand: 'Danger Jones', name: 'Liquid Semi-Permanent', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'ml', sizeOptions: ['118ml'] },
```

This is a data-only change in one file. Let me know if you want to keep the 120ml option for Epilogue or adjust any sizes.

