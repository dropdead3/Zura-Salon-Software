

## Make Appointment Cards Follow Category Colors with Ghost Style

### Problem
All appointment cards look nearly identical in dark mode. The 0.28 opacity fill blends into the dark background, making category colors indistinguishable. The user wants a "ghost" aesthetic — translucent cards where the category color is clearly visible.

### Fix
**1 file**: `src/utils/categoryColors.ts` — `getDarkCategoryStyle()` function

Increase opacity and enhance the ghost aesthetic:

```
// Current (barely visible)
fillAlpha = isGray ? 0.30 : 0.28
hover    = isGray ? 0.38 : 0.36
selected = isGray ? 0.44 : 0.40
glowAlpha = isGray ? 0.08 : 0.15

// Ghost style (translucent but clearly tinted)
fillAlpha = isGray ? 0.18 : 0.15
hover    = isGray ? 0.25 : 0.22
selected = isGray ? 0.32 : 0.28
glowAlpha = isGray ? 0.12 : 0.22
```

Additionally, change the border approach for a true ghost card feel:
- Remove the solid 1px border and replace with a subtle same-color border at low opacity
- Keep the 4px left accent bar using the full category color
- Add `backdropFilter: 'blur(8px)'` for frosted glass depth

**Also modify**: `src/components/dashboard/schedule/AppointmentCardContent.tsx` — the `cardStyle` block (lines 496-507)

Update the dark+category style to use ghost properties:

```tsx
// Ghost card style
backgroundColor: darkStyle.fill,        // lower opacity tint
color: darkStyle.text,                   // category color for text
borderColor: `rgba(r,g,b, 0.25)`,       // subtle matching border
borderWidth: '1px',
borderStyle: 'solid',
borderLeftColor: darkStyle.accent,       // strong accent bar
borderLeftWidth: '4px',
backdropFilter: 'blur(8px)',             // frosted glass
boxShadow: darkStyle.glow,              // subtle category glow
```

### Result
Cards become frosted-glass panels with a visible category color tint, a strong left accent bar, and a subtle matching glow — each category clearly distinguishable while maintaining the dark-mode aesthetic.

### Scope
- `src/utils/categoryColors.ts` — adjust opacity values and add backdrop blur property
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — apply backdrop blur in card style

