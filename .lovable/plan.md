

# Premium Visual Refinement Pass — Zura Backroom Paywall

## Scope
Three techniques applied across the existing page structure: gradient canvas backgrounds, section framing, and progressive scroll reveal. No content or structure changes.

## 1. Scroll Reveal Hook (`useScrollReveal`)
Add a lightweight `useIntersectionObserver`-based hook at the top of the component that applies a CSS class when elements enter the viewport. Create a reusable `RevealOnScroll` wrapper component inline:

```tsx
const RevealOnScroll = ({ children, className, delay = 0 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={cn('transition-all duration-700 ease-out', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6', className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
};
```

Add `import { useRef } from 'react'` (already has `useState, useEffect`).

## 2. Gradient Canvas Backgrounds
Add soft radial gradient overlays to three key sections using inline `style` or pseudo-element classes:

- **Hero section** (line 410): Add a soft radial gradient behind the hero card:
  ```
  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 50%, hsl(var(--primary) / 0.04) 0%, transparent 70%)' }} />
  ```
  Make the hero section `relative overflow-hidden`.

- **Pricing section** (line 1683): Add a very subtle top-to-bottom gradient:
  ```
  background: linear-gradient(to bottom, hsl(var(--primary) / 0.02), transparent 60%)
  ```

- **Final CTA section** (line 2007): Add a radial glow behind the CTA:
  ```
  radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.06) 0%, transparent 60%)
  ```

## 3. Section Framing Enhancement
The tinted sections already use `bg-muted/20 rounded-2xl`. Upgrade them with subtle inner shadow for depth:

For sections at lines 606, 813, 1090, 1332, 1504, 1837, 1968 — add `shadow-[inset_0_1px_0_0_hsl(var(--border)/0.3)]` to create a soft inner top edge that gives the framing cards more definition.

## 4. Progressive Scroll Reveal Application
Wrap these elements in `<RevealOnScroll>`:

- **Section headings** (each `SectionHeading` + subtitle block) — no delay
- **Feature card grids** (Sections 4, 4.9) — wrap each card with staggered `delay={i * 80}`
- **How It Works cards** (Section 3) — stagger `delay={i * 100}`
- **Before/After cards** (Section 1.75) — left card `delay=0`, right `delay=100`
- **ROI proof cards** (Section 4.75) — stagger `delay={i * 80}`
- **Confidence layer cards** (Section 7.5) — stagger `delay={i * 60}`
- **Pricing card** — single reveal, no delay
- **Real Salon Scenario steps** — wrap the entire grid, single reveal

Do NOT wrap: Hero (should be visible immediately), FAQ accordion, location selector, checkout dialog.

## 5. Hero Visual Enhancement
- Add `relative overflow-hidden` to hero `<section>`
- Add a decorative radial gradient div behind the right column (system preview card):
  ```tsx
  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none hidden lg:block" />
  ```
- Add subtle `shadow-xl shadow-primary/5` to the hero Card (line 449) for depth

## 6. Card Depth Consistency
- Feature cards in Section 4: upgrade from `shadow-sm` to `shadow-sm hover:shadow-md transition-shadow duration-200`
- How It Works cards (Section 3): same treatment
- Pricing card: add `shadow-md`

## 7. Interaction Polish
- Hero step indicator buttons: add `hover:scale-110 transition-transform duration-150`
- ActivateButton: already has shadow transitions — add `active:scale-[0.98]` for press feedback

## Implementation Summary
All changes in `BackroomPaywall.tsx`:
1. Add `useRef` import (line 1)
2. Add `RevealOnScroll` component after `SectionHeading` helper (~line 401)
3. Add gradient overlay div inside hero section (after line 410)
4. Add decorative blur orb in hero right column (after line 447)
5. Upgrade hero Card shadow (line 449)
6. Add hero step indicator hover scale (line 582)
7. Wrap ~8 section heading+content blocks in `<RevealOnScroll>`
8. Add `shadow-[inset_0_1px_0_0_hsl(var(--border)/0.3)]` to 7 tinted sections
9. Add gradient backgrounds to Pricing and Final CTA sections
10. Add `active:scale-[0.98]` to ActivateButton

Performance: Pure CSS transitions + single IntersectionObserver per element. No libraries. Observer disconnects after first trigger.

