
Strong report — you pinpointed the exact UI symptom clearly.

### Implementation Steps
1. Update `src/styles/silver-shine.css` to move from “single rotating arc only” to a **two-layer stroke system**:
   - Add a **static full-perimeter silver base stroke** (always visible).
   - Keep a **rotating reflective highlight** on top for motion.
2. Convert stroke rendering to a **masked border technique** (instead of relying only on padding reveal), so the stroke is guaranteed around all 4 sides regardless of button width.
3. Keep interaction behavior:
   - Hover/active: pause + fade moving highlight only.
   - Reduced motion: disable rotating highlight, keep static silver stroke visible.
4. Adjust `src/components/dashboard/SilverShineButton.tsx` classes only if needed to support the mask approach (retain current sizing/spacing and existing control-row layout behavior).
5. Apply same shared button wrapper behavior to both insights drawers automatically (already shared via `SilverShineButton`), no duplicated per-drawer styling.

### Technical Details
- File: `src/styles/silver-shine.css`
  - Add base stroke layer (static metallic ring).
  - Add moving conic highlight layer (reflective sweep).
  - Use `mask-composite` / `-webkit-mask-composite` ring mask to constrain both layers to stroke-only.
  - Preserve `prefers-reduced-motion` fallback with static ring retained.
- File: `src/components/dashboard/SilverShineButton.tsx`
  - Keep structure stable; only minimal class adjustments if mask-based stroke requires removing/altering current `p-[1px]` dependency.

### Validation Steps
1. Check `/dashboard` at full/short/icon density widths and confirm Zura Insights stroke is continuously visible.
2. Confirm reflective sweep travels visibly across top/right/bottom/left edges.
3. Hover/press: moving shine pauses/fades without removing base stroke.
4. `prefers-reduced-motion`: no animation, but visible silver stroke remains.
5. Verify both leadership (`AIInsightsDrawer`) and personal (`PersonalInsightsDrawer`) collapsed buttons behave identically.
