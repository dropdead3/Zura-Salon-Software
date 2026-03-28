

## Problem

Light mode across all four themes is still too bright and white. The background sits at 96-97% lightness and cards at 97% — everything reads as near-white. The user wants a more muted, grayed-down aesthetic with very little pure white.

## Strategy: Shift to a warm-gray foundation

Drop all light mode surfaces significantly — think "warm stone" not "cream paper." The page canvas should feel like a soft gray, cards like slightly lighter panels on that gray, and inner surfaces darker still.

### Target lightness hierarchy

| Token | Current | New | Effect |
|-------|---------|-----|--------|
| `--background` | 96% | **90%** | Distinctly gray canvas |
| `--card` | 97% | **93%** | Visible panels on gray bg |
| `--popover` | 97% | **93%** | Match card |
| `--sidebar-background` | 97-98% | **91%** | Sidebar reads as surface |
| `--card-inner` | 95% | **89%** | Nested surfaces darker |
| `--card-inner-deep` | 93% | **86%** | Deep nesting visible |
| `--secondary` | 89% | **84%** | Clear secondary fills |
| `--muted` | 85% | **78%** | Strong muted fills |
| `--accent` | 87% | **82%** | Visible hover/active |
| `--border` | 80% | **72%** | Crisp borders |
| `--input` | 87% | **80%** | Inputs clearly bounded |
| `--oat` | 82% | **75%** | Stronger accent |
| `--sidebar-accent` | 89% | **84%** | Match secondary |
| `--sidebar-border` | 80% | **72%** | Match border |
| `--muted-foreground` | 40% | **35%** | Darker secondary text |

### Per-theme values

**File: `src/index.css`** — Light mode only (dark mode untouched)

**Cream (`:root` / `.theme-cream`):**
```
--background: 40 20% 90%;
--card: 40 18% 93%;
--popover: 40 18% 93%;
--secondary: 40 14% 84%;
--muted: 40 10% 78%;
--muted-foreground: 0 0% 35%;
--accent: 40 18% 82%;
--oat: 35 25% 75%;
--border: 40 10% 72%;
--input: 40 10% 80%;
--sidebar-background: 40 18% 91%;
--sidebar-accent: 40 14% 84%;
--sidebar-border: 40 10% 72%;
--card-inner: 40 12% 89%;
--card-inner-deep: 40 8% 86%;
```

**Rose (`.theme-rose`):**
```
--background: 350 18% 90%;
--card: 350 16% 93%;
--popover: 350 16% 93%;
--secondary: 350 12% 84%;
--muted: 350 8% 78%;
--muted-foreground: 350 6% 35%;
--accent: 350 16% 82%;
--oat: 350 20% 75%;
--border: 350 8% 72%;
--input: 350 8% 80%;
--sidebar-background: 350 16% 91%;
--sidebar-accent: 350 12% 84%;
--sidebar-border: 350 8% 72%;
--card-inner: 350 8% 89%;
--card-inner-deep: 350 5% 86%;
```

**Sage (`.theme-sage`):**
```
--background: 145 15% 90%;
--card: 145 12% 93%;
--popover: 145 12% 93%;
--secondary: 145 10% 84%;
--muted: 145 6% 78%;
--muted-foreground: 145 5% 35%;
--accent: 145 12% 82%;
--oat: 145 15% 75%;
--border: 145 6% 72%;
--input: 145 6% 80%;
--sidebar-background: 145 12% 91%;
--sidebar-accent: 145 10% 84%;
--sidebar-border: 145 6% 72%;
--card-inner: 145 6% 89%;
--card-inner-deep: 145 4% 86%;
```

**Ocean (`.theme-ocean`):**
```
--background: 210 18% 90%;
--card: 210 15% 93%;
--popover: 210 15% 93%;
--secondary: 210 12% 84%;
--muted: 210 8% 78%;
--muted-foreground: 210 6% 35%;
--accent: 210 14% 82%;
--oat: 210 18% 75%;
--border: 210 8% 72%;
--input: 210 8% 80%;
--sidebar-background: 210 15% 91%;
--sidebar-accent: 210 12% 84%;
--sidebar-border: 210 8% 72%;
--card-inner: 210 8% 89%;
--card-inner-deep: 210 5% 86%;
```

### What changes
- The entire light mode shifts from "bright white paper" to "warm stone/gray"
- Cards are lighter than the background (93 vs 90), creating visible lifted panels
- Borders at 72% are clearly defined
- Muted fills at 78% are unmistakable
- Very little white anywhere — the lightest surface is 93%
- Dark mode is completely untouched

### Files modified
- `src/index.css` — all four light theme blocks (cream, rose, sage, ocean)

