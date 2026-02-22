
# Fix: Position Service Labels Within Their Color Bands

## Problem

The previous fix for overlapping labels moved all service names into a simple stacked list at the top of the card. While this solved the overlap, it broke the spatial mapping -- the "Maintenance Cut" label now sits at the top alongside "Full Balayage" and "Blowout", even though its blue color band is at the bottom of the card. Labels should visually correspond to their time-slot bands.

## Solution

Merge the service labels into the color band rendering itself. Instead of having separate layers (background bands in one absolute div, labels in another), render each label **inside** its proportional band section. This guarantees every label sits within its corresponding color area, regardless of card height.

### Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

1. **Update the color bands div (lines 452-467)**: Add service name labels inside each band `div`, so each band both shows its background color and displays its label. The bands already have the correct proportional `flex` sizing.

2. **Remove the separate service label block (lines 530-538)**: The `flex flex-col` service list we added in the previous fix becomes redundant since labels now live inside the bands.

**Updated color bands block (lines 452-467):**
```tsx
{serviceBands && useCategoryColor && (
  <div className="absolute inset-0 flex flex-col overflow-hidden rounded-md">
    {serviceBands.map((band, i) => {
      const bandDark = isDark ? getDarkCategoryStyle(band.color.bg) : null;
      return (
        <div
          key={i}
          className="relative overflow-hidden"
          style={{
            flex: `${band.percent} 0 0%`,
            backgroundColor: bandDark ? bandDark.fill : band.color.bg,
          }}
        >
          {duration >= 60 && (
            <span className="absolute bottom-0 left-1.5 text-[10px] opacity-90 truncate right-1.5"
              style={{ textShadow: '0 0 3px rgba(0,0,0,0.15)' }}>
              {band.name} <span className="opacity-70">{band.duration}min</span>
            </span>
          )}
        </div>
      );
    })}
  </div>
)}
```

Each label anchors to the **bottom** of its band section, so the Maintenance Cut label appears at the bottom of the blue band area at the card's base.

**Updated label block (lines 530-538):**
Replace the conditional multi-service rendering so it falls through to the single-service display when `serviceBands` exists (since labels are now inside the bands):

```tsx
{duration >= 60 && serviceBands && serviceBands.length > 1 ? (
  null /* labels rendered inside color bands above */
) : (
  <div className="text-xs opacity-90 truncate">
    {(duration >= 45 && formatServicesWithDuration(...)) || appointment.service_name}
  </div>
)}
```

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Move service labels inside proportional color band divs; remove redundant stacked label block |

No new files, no database changes, no dependency changes.
