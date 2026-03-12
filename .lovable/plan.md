

## Add Import Tips & Downloadable CSV Template

### What
Enhance the upload step (step 1) of `DataImportWizard` with:
1. **Import tips callout** — formatting guidance (UTF-8, no merged cells, one header row, etc.)
2. **Downloadable CSV template** — a "Download Template" button that generates a CSV file with the correct column headers for the selected `dataType`, plus one example row

### Changes

**Edit: `src/components/admin/DataImportWizard.tsx`**

1. **Add a `generateTemplate` function** that uses the existing `FIELD_DEFINITIONS[dataType]` to build a CSV string with headers + one sample row, then triggers a browser download (`Blob` + `URL.createObjectURL` + programmatic anchor click). File named `{dataType}_import_template.csv`.

2. **In the `upload` step render block** (between the drag-and-drop zone and the location selector), add:
   - A **"Download Template"** button (`Download` icon from lucide) that calls `generateTemplate`
   - A compact **tips section** with an `Info` icon and a list of formatting notes:
     - Use CSV format (comma-separated)
     - First row must be column headers
     - Required fields: list the required field names for the current `dataType`
     - Prices should be numeric without currency symbols (e.g. `14.99`)
     - Dates in `YYYY-MM-DD` format
     - UTF-8 encoding recommended
     - Tip: use the "Dry Run" option on the preview step to validate before committing

### No database changes, no new files
Single file edit — all logic derived from the existing `FIELD_DEFINITIONS` constant.

