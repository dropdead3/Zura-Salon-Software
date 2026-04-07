

# Upgrade Level Roadmap PDF to Match Digital Typography

## Why It Looks Different Today

The PDF generator (`LevelRequirementsPDF.ts`) uses jsPDF's built-in `helvetica` font for everything. The digital roadmap uses **Termina** (headlines, uppercase labels) and **Aeonik Pro** (body text). That font mismatch is the single biggest gap between the two outputs.

jsPDF *can* embed custom fonts, but OTF files must be converted to base64 and registered via `doc.addFileToVFS()` + `doc.addFont()`. The project already has the font files in `public/fonts/`.

## What Changes

### 1. Embed Termina and Aeonik Pro into jsPDF

- Convert `Termina-Medium.otf` and `AeonikPro-Regular.otf` + `AeonikPro-Medium.otf` to base64 strings (generated once at build time or stored as static TS modules)
- Register them with jsPDF at the start of `generateLevelRequirementsPDF()`
- Replace all `doc.setFont('helvetica', ...)` calls with the correct font family

**Font mapping:**
| Current (helvetica) | New font | Usage |
|---------------------|----------|-------|
| `helvetica, bold` for titles | `Termina, normal` (weight 500) | Card titles, org name, section headers, KPI values |
| `helvetica, normal` for body | `AeonikPro, normal` (weight 400) | Descriptions, labels, footer text |
| `helvetica, bold` for stats | `Termina, normal` | Stat values, level numbers |

### 2. Typography Refinements

- Increase letter-spacing (`charSpace`) on Termina text to match the digital `tracking-[0.08em]` feel
- Adjust font sizes slightly — Termina renders larger than Helvetica at the same point size
- Section headers (COMPENSATION, RETENTION MINIMUMS) get Termina with wide tracking to match the digital eyebrow style
- KPI labels stay Aeonik Pro (normal case in digital, but uppercase is acceptable in PDF context since they're short metric names)

### 3. Visual Polish to Match Digital

- Slightly softer card border color (currently `225,225,225` → match the digital's `border-border/60`)
- Footer text in Aeonik Pro instead of Helvetica
- Org name header in Termina with proper tracking

## Technical Approach

Create a new file `src/lib/pdf-fonts.ts` that exports the base64 font data as constants. This keeps the main PDF file clean and allows reuse by `StaffLevelReportPDF.ts`.

The font files are ~50-80KB each as OTF. Base64 encoding adds ~33% overhead, so total addition is ~200-300KB of static JS. This is acceptable since it only loads when the user clicks "Download PDF."

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf-fonts.ts` (new) | Base64 font data + jsPDF registration helper |
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | Replace all `helvetica` → Termina/Aeonik Pro, adjust spacing |
| `src/components/dashboard/settings/StaffLevelReportPDF.ts` | Same font swap for consistency |

## No Risk

- Fonts only load on PDF download (lazy import)
- No UI changes
- No database changes
- Fallback: if font registration fails, jsPDF falls back to Helvetica automatically

