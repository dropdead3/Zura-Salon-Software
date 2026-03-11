

## Add Product Photo Avatars to Table Rows

### What

Add a small circular avatar to each product row in both the **Products** table and **Inventory** table. If the product has an `image_url`, show the photo. Otherwise, show initials (first letter of each word, max 2 letters) with a colored background.

### Changes

**Edit: `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**

**Products table (line ~219)** — Replace the plain text product name cell:
```tsx
// Before
<TableCell className="font-medium text-sm">{p.name}</TableCell>

// After
<TableCell>
  <div className="flex items-center gap-2.5">
    <Avatar className="h-8 w-8 shrink-0">
      {p.image_url ? (
        <AvatarImage src={p.image_url} alt={p.name} className="object-cover" />
      ) : null}
      <AvatarFallback className="text-[10px] font-medium bg-muted">
        {getInitials(p.name)}
      </AvatarFallback>
    </Avatar>
    <span className="font-medium text-sm">{p.name}</span>
  </div>
</TableCell>
```

**Inventory table (line ~790)** — Same avatar treatment for the product name cell.

**Helper function** — Add a `getInitials` utility at the top of the file:
```ts
function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
```

**Imports** — Add `Avatar, AvatarImage, AvatarFallback` from `@/components/ui/avatar`.

No new files, no database changes. Just a UI enhancement to both product tables.

