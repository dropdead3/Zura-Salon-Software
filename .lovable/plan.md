

## Scale Up DockIngredientDispensing UI Elements

Everything on this screen needs to be bigger for backroom iPad use — except the lock button (bottom-right).

### Changes — `src/components/dock/mixing/DockIngredientDispensing.tsx`

**1. Teardrop**
- `size={160}` → `size={200}` (bigger visual cue)

**2. Product name**
- `text-sm` → `text-lg` for product name
- `text-xs` → `text-sm` for brand

**3. Weight pill**
- `text-2xl` → `text-3xl` for weight/tap-to-weigh text
- `text-sm` → `text-base` for target weight
- `px-5 py-2.5` → `px-7 py-3.5` for larger touch target

**4. Pagination dots**
- `w-2 h-2` → `w-2.5 h-2.5`, active `w-6` → `w-8`

**5. Navigation header**
- Back button: `w-9 h-9` → `w-11 h-11`, icon `w-4 h-4` → `w-5 h-5`
- Chevrons: `w-8 h-8` → `w-10 h-10`, icon `w-4 h-4` → `w-5 h-5`
- Page counter: `text-xs` → `text-sm`

**6. Action bar**
- Icons: `w-5 h-5` → `w-6 h-6`
- Labels: `text-[10px]` → `text-xs`
- Button padding: `py-2 px-3` → `py-3 px-4`
- Gap between buttons: `gap-6` → `gap-8`

**7. Bottom carousel cards**
- Width: `w-[140px]` → `w-[170px]`
- Swatch: `w-5 h-5` → `w-6 h-6`
- Product name: `text-[10px]` → `text-xs`
- Weight text: `text-[10px]` → `text-[11px]`
- Padding: `p-3` → `p-3.5`

**No change**: Lock/seal button (rendered in parent `DockLiveDispensing`, not in this file)

### One file changed
`src/components/dock/mixing/DockIngredientDispensing.tsx`

