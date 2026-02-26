

## Fix: Footer Reveal Bleeding Through First Section

### Problem

The Layout uses a "parallax footer reveal" pattern where:
1. The `<Footer>` is `fixed bottom-0 z-0` — always rendered at the bottom of the viewport
2. The main content is `relative z-10 bg-background` with `marginBottom: footerHeight` — creates a gap at the bottom where the footer reveals as you scroll

**The bug**: The footer content ("Death to bad hair", "Navigate", "Locations") is confirmed visible behind the hero section because:
- The `rounded-b-[2rem]` on the main content div clips the bottom corners, creating gaps where the fixed footer peeks through
- The gradient overlay div (`absolute bottom-0`, `h-24 md:h-32`) uses semi-transparent backgrounds (`hsl(var(--background) / 0.5)`) that don't fully cover the footer
- On initial page load, `footerHeight` starts at `0` and jumps to the real value after 100ms, causing a layout shift

### Fix

**Hide the fixed footer until the user is near the bottom of the page.** Instead of always rendering the footer behind the content and relying on the content to cover it, we control footer visibility with scroll position.

#### File: `src/components/layout/Layout.tsx`

1. **Add scroll-based footer visibility**: Track whether the user has scrolled near the bottom of the page. Only show the fixed footer when they're within range of the footer reveal area.

2. **Set the footer to `visibility: hidden` / `opacity: 0` until scroll threshold is met**: This prevents the footer from bleeding through content at any scroll position.

3. **Remove the gradient overlay div entirely** (lines 100-108): This decorative gradient at `absolute bottom-0` adds a semi-transparent layer that interferes with content and doesn't add meaningful value to the reveal effect. The `rounded-b-[2rem]` + `shadow` on the main content div already provides a clean visual transition to the footer.

```tsx
// Add to Layout component:
const [showFooter, setShowFooter] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    // Show footer when within 2 viewport heights of the bottom
    setShowFooter(scrollY + windowHeight > documentHeight - windowHeight * 2);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// On the fixed footer wrapper:
<div
  ref={footerRef}
  className="fixed bottom-0 left-0 right-0 z-0 transition-opacity duration-300"
  style={{ opacity: showFooter ? 1 : 0, visibility: showFooter ? 'visible' : 'hidden' }}
>
  <Footer />
</div>
```

4. **Remove the gradient overlay div** (the `absolute bottom-0 h-24 md:h-32` div with blur/gradient) — it serves no purpose now and was the primary source of visual bleed.

### Files

| File | Change |
|---|---|
| `src/components/layout/Layout.tsx` | Add scroll-based footer visibility, remove gradient overlay |

### Technical Notes

- The footer still measures correctly via `ResizeObserver` (it's in the DOM, just hidden)
- `visibility: hidden` preserves layout measurement while preventing rendering artifacts
- The scroll threshold (2x viewport height from bottom) ensures the footer fades in well before the user reaches the reveal area
- The `transition-opacity duration-300` provides a smooth appearance

