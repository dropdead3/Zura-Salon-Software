

# Fix Roadmap PDF Embedded Font Rendering

## Problem

The Level Roadmap PDF renders garbled/unreadable text (visible in screenshot). This is because **jsPDF only supports TrueType (.ttf) fonts**, but the `pdf-fonts.ts` file embeds OpenType CFF (.otf) fonts. jsPDF silently accepts the OTF data but cannot parse the CFF glyph outlines, producing corrupted character mapping.

## Solution

Convert the three OTF font files to TTF format, then re-encode them as base64 for embedding.

### Steps

**1. Convert OTF → TTF** (build-time, one-off script)

Use `fonttools` (Python) to convert:
- `public/fonts/Termina-Medium.otf` → `Termina-Medium.ttf`
- `public/fonts/AeonikPro-Regular.otf` → `AeonikPro-Regular.ttf`
- `public/fonts/AeonikPro-Medium.otf` → `AeonikPro-Medium.ttf`

Place the TTF files in `public/fonts/` alongside the originals.

**2. Regenerate `src/lib/pdf-fonts.ts`**

- Replace the three base64 constants with base64 from the new `.ttf` files
- Update `addFileToVFS` calls to reference `.ttf` filenames
- No changes to the public API (`registerPdfFonts`, `setTermina`, `setAeonik`)

**3. No changes to PDF generation code**

`LevelRequirementsPDF.ts`, `StaffLevelReportPDF.ts`, and `IndividualStaffReport.tsx` all call `registerPdfFonts(doc)` — they will automatically pick up the fixed fonts.

### Files Changed

| File | Change |
|---|---|
| `public/fonts/Termina-Medium.ttf` | New TTF conversion |
| `public/fonts/AeonikPro-Regular.ttf` | New TTF conversion |
| `public/fonts/AeonikPro-Medium.ttf` | New TTF conversion |
| `src/lib/pdf-fonts.ts` | Re-encoded base64 from TTF files, updated VFS filenames |

No database changes.

