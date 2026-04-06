

# Level Roadmap: Bugs, Gaps, and Enhancements

## Bugs

### 1. PDF status badge text mismatch
- **Digital**: Shows "Configured" / "Setup Incomplete"
- **PDF** (line 328): Shows "Configured" / "Setup Incomplete" — OK
- **PDF timeline** (line 213): Shows "Ready" / "Incomplete" — matches digital timeline
- **Digital accordion header** (line 457): Shows "Ready" / "Incomplete" — but the card body (line 489/493) shows "Configured" / "Setup Incomplete"
- **Inconsistency**: The accordion collapsed header says "Ready" while the expanded card body says "Configured" for the same level. These should match.

### 2. PDF card height estimation is wrong when no KPIs exist for non-base levels
- Line 291-292: When `kpis.length === 0` and it's not the base level, the estimation adds `14` for the "no KPI" message, but the actual rendering (line 459-464) adds `10` to `cy`. Meanwhile the estimation for the "else" base case (line 466) adds only `4`. This mismatch can cause card borders to clip content or leave excessive whitespace.

### 3. Print clone doesn't handle conditional React rendering
- The `handlePrint` clone approach (line 112-122) removes `.hidden` CSS classes, but accordion content that was never rendered (React conditional `useAccordion && !isExpanded ? 'hidden' : 'block'`) is present in the DOM as a hidden div. The code strips `.hidden` — this works. However, it doesn't address the **accordion header button** (line 438-471) which is marked `print:hidden` — the clone strips these, which is correct. But the **non-accordion header** (line 480-499) only renders when `useAccordion` is false, meaning for 7+ levels, the card body shows content but the title row is only inside the accordion button that got stripped. Result: **print output for 7+ levels will show cards without titles**.

### 4. `isConfigured` logic differs between digital and PDF
- **Digital** (line 396): Uses `level.isConfigured` from the prop
- **PDF** (line 255): Uses `level.index === 0 || !!promo` — derives it independently
- If `isConfigured` is set differently than whether promo exists (e.g., manually flagged), the PDF will show different status than the digital view.

## Gaps

### 5. Print doesn't show the non-accordion title when accordion mode is active
- As noted in bug #3, when `useAccordion` is true, the full card title + badge is inside the `<button>` element which gets stripped. The inner `<div className="p-5">` contains the title block (line 480-499) but it's **inside** the conditionally rendered content block — so it IS there. Actually wait — looking again at line 474-477, the content div wraps everything from line 478-595. The title at line 480 is inside this div. And the accordion button at 438-471 is a separate sibling. So stripping the button and showing the content div should work. **This is actually OK** — the title is duplicated in both the button and the content body.

### 6. PDF doesn't pass `isConfigured` from the caller
- The PDF `LevelInfo` interface (line 11-16) doesn't include `isConfigured`. It derives it from `level.index === 0 || !!promo`. The digital view receives `isConfigured` as a prop. If the org marks a level as configured without setting up promo criteria, the PDF will show it as incomplete while the digital shows it as configured.
- **Fix**: Add `isConfigured` to the PDF's `LevelInfo` interface and use it.

### 7. PDF missing "No KPI requirements" empty state for base level with no retention KPIs
- Digital (line 553-557) shows "No KPI requirements configured" for non-base levels. For base levels with no retention KPIs, nothing is shown (which is correct).
- PDF (line 459-467) matches this behavior. OK.

### 8. Print footer uses fixed positioning which may not work reliably across browsers
- The `position: fixed` footer in the print window (line 170-181) doesn't reliably repeat on every printed page in all browsers. Chrome handles it, but Firefox and Safari may only show it on the first or last page.

## Enhancements

### 9. Add `isConfigured` to PDF interface for consistency
Pass the same `isConfigured` flag from the caller instead of deriving it.

### 10. Unify badge text across accordion header and card body
Change the accordion header badges from "Ready"/"Incomplete" to "Configured"/"Setup Incomplete" — or vice versa. Pick one and use it everywhere.

### 11. Print: ensure the accordion title is always visible
Even though the content div has the title, consider adding a `print:block` override on the accordion button or ensuring the content title is never hidden.

### 12. PDF: add the digital view's "No KPI requirements" styled box for non-base levels
Currently the PDF shows plain italic text. Match the digital's rounded `bg-neutral-50 border` styled box.

---

## Summary of recommended changes

| # | Type | File | Change |
|---|------|------|--------|
| 1 | Bug | `LevelRoadmapView.tsx` | Unify badge text: accordion header vs card body ("Ready" vs "Configured") |
| 2 | Bug | `LevelRequirementsPDF.ts` | Fix card height estimation for empty KPI states |
| 4 | Bug | `LevelRequirementsPDF.ts` | Add `isConfigured` to `LevelInfo` interface, use it instead of deriving |
| 8 | Gap | `LevelRoadmapView.tsx` | Add `@bottom-center` CSS fallback or note the footer limitation |
| 10 | Enhancement | Both files | Standardize status badge copy across all three outputs |

No database changes. No new files.

