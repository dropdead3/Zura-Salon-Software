

# Print Scope: Only Print the Level Roadmap Document

## Problem
When clicking "Print" from the Level Roadmap overlay, `window.print()` prints the entire page — including the dashboard, sidebar, God Mode bar, and the settings page beneath the overlay. Only the roadmap document should print.

## Solution
Add print-specific CSS that hides the root app content and only shows the roadmap overlay when printing. This is a targeted CSS-only fix.

### Approach
1. **Add a print stylesheet rule** in `index.css` (or the roadmap component) that:
   - Hides `body > #root > *` (the main app tree) on print
   - Shows the roadmap's fixed overlay as a static, full-width block on print
   
2. **In `LevelRoadmapView.tsx`**, give the outermost container a specific ID or class (e.g., `data-print-target="roadmap"`) so it can be selected in CSS.

3. **Global print CSS** (in `index.css`):
   ```css
   @media print {
     body > * { visibility: hidden; }
     [data-print-target="roadmap"] { 
       visibility: visible; 
       position: static; 
       z-index: auto; 
     }
   }
   ```

   Alternatively, use a React Portal approach: when printing, the roadmap is already `fixed inset-0 z-[80]`, but sibling content still renders. The cleanest fix is toggling a `printing` class on the `<body>` element around `window.print()`, then using CSS to hide siblings.

### Implementation Detail
- In `LevelRoadmapView.tsx`, update the print handler:
  ```tsx
  const handlePrint = () => {
    document.body.classList.add('printing-roadmap');
    window.print();
    document.body.classList.remove('printing-roadmap');
  };
  ```
- In `index.css`, add:
  ```css
  @media print {
    body.printing-roadmap > #root { display: none; }
  }
  ```
- The roadmap container already renders as a sibling or via portal — since it's inside `#root`, we need to instead hide everything except the roadmap. The better approach: mark the roadmap with a data attribute, then in print media hide all `#root` children except the roadmap's ancestor.

Since the roadmap is rendered inside the `StylistLevelsEditor` component tree (inside `#root`), the simplest approach is:
- Add `data-roadmap-print` to the roadmap's outermost `div`
- In print CSS, hide everything except elements with that attribute by using visibility toggling

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | Add `data-roadmap-print` attribute; update print handler to toggle body class |
| `src/index.css` | Add `@media print` rules for `body.printing-roadmap` to hide non-roadmap content |

No new files, no database changes.

