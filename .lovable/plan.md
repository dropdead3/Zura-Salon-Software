

## Add "X" Clear Buttons to Selected Specialties and Highlighted Services

### Specialties Section (lines 1165-1187)

When a specialty is **selected**, show an `X` icon inside the button to make deselection obvious:

```tsx
{isSelected && <X className="w-3 h-3 ml-0.5" />}
```

Add it after `{displayName}` inside the button. The button already calls `toggleSpecialty` on click, so no logic changes needed — just visual clarity.

### Highlighted Services Section (lines 1212-1229)

When a highlighted service is **selected**, replace the `Check` icon with an `X` icon (or show both — check on left, X on right):

```tsx
// Change from:
{isSelected ? <Check className="w-3 h-3 mr-1" /> : null}

// To:
{isSelected && <X className="w-3 h-3 ml-1" />}  // after the label text
```

This makes it clear that clicking removes the item.

### Files Changed

- `src/pages/dashboard/MyProfile.tsx` — two small UI additions within the existing specialty and highlighted service button/badge renders

