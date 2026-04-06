

# Improve Staff Level Report PDF — Typography and Layout Polish

## Problems Visible in Screenshot

1. **Key Gap column text has extreme letter-spacing** — "S e r v i c e  R e v e n u e : $ 0 / m o → $ 8 0 0 0 / m o" is unreadable. The `charSpace` from the header is likely leaking into `autoTable`, or `autoTable` is inheriting a global charSpace setting.
2. **Header charSpace too wide** — org name and subtitle kerning is excessively spread (though intentional for the header, it needs tightening).
3. **Table looks sparse** — single row with lots of whitespace; the group header row ("Studio Artist / 1 stylist") could be styled more distinctively.
4. **Summary strip values could be bolder** — the "0" values blend together.

## Root Cause

jsPDF's `charSpace` is a **sticky global state**. After setting `charSpace: 1.5` on the org name (line 98) and `charSpace: 2` on the subtitle (line 104), the character spacing persists into all subsequent text calls including autoTable. This explains the broken Key Gap text.

## Fix Plan

### 1. Reset `charSpace` after header text (critical bug fix)
After the header section, explicitly call `doc.setCharSpace(0)` before the summary strip and table rendering. This is the primary fix for the garbled table text.

### 2. Refine header typography
- Org name: reduce `charSpace` from 1.5 to 1.0, increase font size slightly to 20
- Subtitle "STAFF LEVEL REPORT": reduce `charSpace` from 2 to 1.2
- Date line: ensure `charSpace` is 0 (body text should never have extra spacing)

### 3. Improve summary strip
- Increase strip height from 22 to 26mm for breathing room
- Use slightly larger stat values (16pt instead of 14pt)
- Add subtle vertical dividers between summary items

### 4. Enhance table styling
- Group header rows: stronger left border accent (2pt dark bar) instead of flat fill
- Increase body font from 7.5 to 8pt for readability
- Name column: slightly wider (45mm)
- Key Gap column: use slightly smaller font (7pt) to fit long text gracefully
- Status column: add a small colored dot before the status text instead of just colored text

### 5. Footer refinement
- Bump footer text from 6pt to 6.5pt

## Files

| File | Change |
|------|--------|
| `src/components/dashboard/settings/StaffLevelReportPDF.ts` | Reset charSpace after header, refine typography sizes/spacing, improve table and summary strip styling |

Single file. No database changes.

