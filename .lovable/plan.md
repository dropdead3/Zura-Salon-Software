

# Move PDF Button to Header — Dynamic Per Active Tab

## Summary
Place a single PDF button next to the location filter in the section header. It dynamically triggers the correct export based on which tab is active (Stock, Counts, Audit Log). Tabs without PDF exports (Orders, Receive, Analytics) hide the button.

## Tab Export Map

| Tab | Has PDF? | Export Function |
|-----|----------|----------------|
| Stock | Yes | `handlePdfExport` (backroom stock report) |
| Counts | Yes | `handlePrintCountSheet` (count sheet PDF) |
| Audit Log | Yes | `exportBulkPdf` (audit log PDF) |
| Orders | No | Button hidden |
| Receive | No | Button hidden |
| Analytics | No | Button hidden |

## Changes

### 1. `BackroomInventorySection.tsx`
- Add a `pdfExportRef = useRef<(() => void) | null>(null)` and `pdfExporting` state
- Derive `hasPdfExport` from `activeTab` — true for `stock`, `counts`, `audit`
- Render a PDF `<Button>` next to the location `<Select>`, conditionally shown when `hasPdfExport` is true
- Pass `pdfExportRef` as a prop to `StockTab`, `CountsTab`, and `AuditLogTab`

### 2. `StockTab.tsx`
- Accept `pdfExportRef` prop, assign `handlePdfExport` to it via `useEffect`
- Remove the two inline PDF buttons from the decision header

### 3. `CountsTab.tsx`
- Accept `pdfExportRef` prop, assign the count sheet export handler to it via `useEffect`
- Remove the inline "Print Count Sheet" button (keep the filtered export dialog as-is since it's a different flow)

### 4. `AuditLogTab.tsx`
- Accept `pdfExportRef` prop, assign `exportBulkPdf` handler to it via `useEffect`
- Remove the inline PDF button from the toolbar

### Implementation Pattern
Each tab child receives `pdfExportRef` and registers its handler:
```tsx
// In each tab component
useEffect(() => {
  if (pdfExportRef) pdfExportRef.current = myExportHandler;
  return () => { if (pdfExportRef) pdfExportRef.current = null; };
}, [deps]);
```

Parent renders conditionally:
```tsx
{['stock', 'counts', 'audit'].includes(activeTab) && (
  <Button variant="outline" size="sm" onClick={() => pdfExportRef.current?.()}>
    <FileDown className="w-4 h-4" /> PDF
  </Button>
)}
```

