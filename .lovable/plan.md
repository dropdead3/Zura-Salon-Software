

## Darken "Save Now" Button on Floating Save Bar

Simple styling update to the Save Now button in the floating unsaved changes bar.

### Change

**File: `src/pages/dashboard/MyProfile.tsx` (line 1480)**

Current:
```
bg-primary text-primary-foreground hover:bg-primary/90
```

Replace with:
```
bg-foreground text-background hover:bg-foreground/80 transition-colors
```

This makes the button dark by default (using `bg-foreground` which is near-black in dark mode, near-black in light mode) and lightens on hover via reduced opacity. The `text-background` ensures the label stays readable against the dark fill.

### What Does Not Change
- Button size, icon, text, or logic
- Discard button styling
- Floating bar container styling

