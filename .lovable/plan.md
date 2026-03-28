

## Problem

All four light mode theme palettes (cream, rose, sage, ocean) are too washed out. The root cause is insufficient lightness separation between CSS custom property layers:

| Token | Current Lightness | Issue |
|-------|------------------|-------|
| `--background` | 96-97% | Fine as page canvas |
| `--card` | 98-99% | **Lighter than background** — cards disappear |
| `--muted` | 88-90% | Too close to background for fills |
| `--border` | 85-88% | Too subtle to define edges |
| `--secondary` | 92-93% | Barely visible against card |
| `--accent` | 90-92% | Nearly invisible |
| `--input` | 90-92% | Blends into card |

The card being *lighter* than the background is the main problem — it inverts the visual hierarchy. Cards should feel like surfaces sitting *on* the background, not holes in it.

## Plan

**File: `src/index.css`** — Adjust all four light theme palettes with the same strategy:

### Strategy: Lower card/surface lightness, strengthen borders

1. **`--card`**: Drop from 98-99% to **97%** — still light, but now *below* background, creating visible depth
2. **`--card-inner`**: Drop to **95-96%** for nested surfaces (subcards, table rows)
3. **`--card-inner-deep`**: Drop to **93-94%** for deep nesting
4. **`--muted`**: Drop from 88-90% to **85-86%** — makes muted fills clearly visible
5. **`--border`**: Drop from 85-88% to **80-82%** — crisp, visible card edges
6. **`--secondary`**: Drop from 92-93% to **89-90%** — visible as a distinct surface
7. **`--accent`**: Drop from 90-92% to **87-88%** — hover states are now perceptible
8. **`--input`**: Drop from 90-92% to **87-88%** — inputs have visible boundaries
9. **`--sidebar-border`**: Match `--border` adjustment
10. **`--sidebar-accent`**: Match `--secondary` adjustment
11. **`--muted-foreground`**: Drop from 45% to **40%** — slightly darker secondary text

### Per-theme values

**Cream (default):**
```
--card: 40 25% 97%;
--muted: 40 15% 85%;
--muted-foreground: 0 0% 40%;
--secondary: 40 20% 89%;
--accent: 40 25% 87%;
--border: 40 15% 80%;
--input: 40 15% 87%;
--sidebar-accent: 40 20% 89%;
--sidebar-border: 40 15% 80%;
--card-inner: 40 20% 95%;
--card-inner-deep: 40 15% 93%;
```

**Rose:**
```
--card: 350 25% 97%;
--muted: 350 15% 86%;
--muted-foreground: 350 10% 40%;
--secondary: 350 20% 90%;
--accent: 350 25% 88%;
--border: 350 15% 82%;
--input: 350 15% 88%;
--sidebar-accent: 350 20% 90%;
--sidebar-border: 350 15% 82%;
--card-inner: 350 15% 95%;
--card-inner-deep: 350 10% 93%;
```

**Sage:**
```
--card: 145 20% 97%;
--muted: 145 12% 85%;
--muted-foreground: 145 10% 40%;
--secondary: 145 18% 89%;
--accent: 145 20% 87%;
--border: 145 12% 80%;
--input: 145 12% 87%;
--sidebar-accent: 145 18% 89%;
--sidebar-border: 145 12% 80%;
--card-inner: 145 12% 95%;
--card-inner-deep: 145 8% 93%;
```

**Ocean:**
```
--card: 210 25% 97%;
--muted: 210 15% 86%;
--muted-foreground: 210 12% 40%;
--secondary: 210 20% 90%;
--accent: 210 22% 88%;
--border: 210 15% 82%;
--input: 210 15% 88%;
--sidebar-accent: 210 20% 90%;
--sidebar-border: 210 15% 82%;
--card-inner: 210 15% 95%;
--card-inner-deep: 210 10% 93%;
```

### What this achieves
- Cards are visibly distinct from the page background
- Borders are crisp and define card edges clearly
- Muted fills (badges, strips, hover states) are perceptible
- Input fields have visible boundaries
- Secondary text has better readability
- Dark mode palettes are completely untouched

### Technical details
- Only modifying CSS custom properties in `:root`/`.theme-*` selectors (light variants only)
- No component file changes needed — all surfaces inherit from these tokens
- The popover values (`--popover`, `--popover-foreground`) will match card values for consistency

