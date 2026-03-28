

## Problem

Light mode is still too bright at 90-93% lightness. The user wants significantly darker, more muted surfaces — closer to a true gray UI with almost no white.

## Strategy: Push to "dark gray" light mode

Drop everything another 6-8% lightness. The lightest surface (card) should be ~85%, background ~82%, and deep nesting down to ~76%. This creates a UI that feels like a warm mid-gray workspace.

### Target lightness hierarchy

| Token | Current | New | Effect |
|-------|---------|-----|--------|
| `--background` | 90% | **82%** | Mid-gray canvas |
| `--card` | 93% | **85%** | Panels visible but not bright |
| `--popover` | 93% | **85%** | Match card |
| `--sidebar-background` | 91% | **83%** | Sidebar reads as distinct surface |
| `--card-inner` | 89% | **80%** | Nested surfaces clearly darker |
| `--card-inner-deep` | 86% | **76%** | Deep nesting unmistakable |
| `--secondary` | 84% | **78%** | Clear secondary fills |
| `--muted` | 78% | **72%** | Strong muted fills |
| `--accent` | 82% | **76%** | Visible hover/active |
| `--border` | 72% | **65%** | Very crisp borders |
| `--input` | 80% | **74%** | Inputs clearly bounded |
| `--oat` | 75% | **68%** | Stronger accent |
| `--sidebar-accent` | 84% | **78%** | Match secondary |
| `--sidebar-border` | 72% | **65%** | Match border |
| `--muted-foreground` | 35% | **30%** | Darker secondary text |
| `--foreground` | 8% | **6%** | Slightly richer primary text |

### Per-theme values

**File: `src/index.css`** — Light mode only (dark mode untouched)

**Cream (`:root` / `.theme-cream`):**
```
--background: 40 15% 82%;
--foreground: 0 0% 6%;
--card: 40 12% 85%;
--card-foreground: 0 0% 6%;
--popover: 40 12% 85%;
--popover-foreground: 0 0% 6%;
--secondary: 40 10% 78%;
--muted: 40 8% 72%;
--muted-foreground: 0 0% 30%;
--accent: 40 12% 76%;
--oat: 35 18% 68%;
--border: 40 8% 65%;
--input: 40 8% 74%;
--sidebar-background: 40 12% 83%;
--sidebar-accent: 40 10% 78%;
--sidebar-border: 40 8% 65%;
--card-inner: 40 8% 80%;
--card-inner-deep: 40 5% 76%;
```

**Rose (`.theme-rose`):**
```
--background: 350 12% 82%;
--foreground: 350 20% 8%;
--card: 350 10% 85%;
--card-foreground: 350 20% 8%;
--popover: 350 10% 85%;
--popover-foreground: 350 20% 8%;
--secondary: 350 8% 78%;
--muted: 350 6% 72%;
--muted-foreground: 350 5% 30%;
--accent: 350 10% 76%;
--oat: 350 14% 68%;
--border: 350 6% 65%;
--input: 350 6% 74%;
--sidebar-background: 350 10% 83%;
--sidebar-accent: 350 8% 78%;
--sidebar-border: 350 6% 65%;
--card-inner: 350 6% 80%;
--card-inner-deep: 350 4% 76%;
```

**Sage (`.theme-sage`):**
```
--background: 145 10% 82%;
--foreground: 145 15% 8%;
--card: 145 8% 85%;
--card-foreground: 145 15% 8%;
--popover: 145 8% 85%;
--popover-foreground: 145 15% 8%;
--secondary: 145 7% 78%;
--muted: 145 5% 72%;
--muted-foreground: 145 4% 30%;
--accent: 145 8% 76%;
--oat: 145 10% 68%;
--border: 145 5% 65%;
--input: 145 5% 74%;
--sidebar-background: 145 8% 83%;
--sidebar-accent: 145 7% 78%;
--sidebar-border: 145 5% 65%;
--card-inner: 145 5% 80%;
--card-inner-deep: 145 3% 76%;
```

**Ocean (`.theme-ocean`):**
```
--background: 210 12% 82%;
--foreground: 210 20% 8%;
--card: 210 10% 85%;
--card-foreground: 210 20% 8%;
--popover: 210 10% 85%;
--popover-foreground: 210 20% 8%;
--secondary: 210 8% 78%;
--muted: 210 6% 72%;
--muted-foreground: 210 5% 30%;
--accent: 210 10% 76%;
--oat: 210 12% 68%;
--border: 210 6% 65%;
--input: 210 6% 74%;
--sidebar-background: 210 10% 83%;
--sidebar-accent: 210 8% 78%;
--sidebar-border: 210 6% 65%;
--card-inner: 210 6% 80%;
--card-inner-deep: 210 4% 76%;
```

### What changes
- The lightest surface is now 85% — no white anywhere
- Background at 82% feels like a true warm gray workspace
- Cards at 85% are lighter panels on the gray canvas (3% lift)
- Borders at 65% are sharp and unmistakable
- Deep nesting at 76% creates clear visual hierarchy
- Foreground text darkened to 6-8% for maximum contrast on gray
- Muted foreground at 30% for strong secondary text
- Dark mode completely untouched

### Files modified
- `src/index.css` — all four light theme blocks

