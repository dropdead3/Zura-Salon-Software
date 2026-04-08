

# Batch Report Downloads + Scheduled Report Deliveries

## Overview

Two connected features: (1) a "Report Pack" tool allowing owners to select multiple reports and download them as a single merged PDF or individual PDFs in a ZIP, and (2) a full Schedule Creator UI that wires into the existing `scheduled_reports` table, with automatic deactivation when staff recipients are archived/removed.

---

## Feature 1: Batch Report Download

### What it does
A modal/panel accessible from the Reports Hub header. The owner checks off reports from the full catalog, chooses a date range, picks "Single PDF" or "Separate PDFs (ZIP)", and clicks Generate. The system runs each report's data hook, renders each to PDF pages using the existing `jsPDF`/`autoTable` pattern, and either merges them into one PDF or bundles them as a ZIP download.

### Implementation

**New files:**
- `src/components/dashboard/reports/batch/BatchReportDialog.tsx` — Dialog with report checklist grouped by category (Sales, Staff, Clients, etc.), date range picker, location filter, output format toggle (merged PDF / ZIP of PDFs), and Generate button
- `src/components/dashboard/reports/batch/useBatchReportGenerator.ts` — Orchestrator hook that: fetches data for each selected report in sequence, calls each report's PDF generation function, merges via `jsPDF` page insertion or bundles via `JSZip`
- `src/lib/reportPdfGenerators.ts` — Refactored: extract the PDF generation logic from individual report components into standalone functions that accept data + filters and return a `jsPDF` doc (currently each report builds PDF inline in its component — these need to be extractable)

**Edited files:**
- `ReportsHub.tsx` — Add "Generate Report Pack" button in header actions
- `ReportsTabContent.tsx` — Add batch download button near category tabs

**Dependencies:** `jszip` (for ZIP bundling option) — needs `npm install jszip`

**Key design decisions:**
- Reports are generated client-side using existing hooks (no new edge function needed for Phase 1)
- Progress indicator shows which report is currently being generated (e.g., "Generating 3 of 7...")
- Maximum of ~15 reports per batch to avoid browser memory issues
- Each report PDF uses the existing branded `reportPdfLayout` header

---

## Feature 2: Schedule Creator UI

### What it does
The existing "Scheduled" tab has a list view and history but **no creation form**. The "New Schedule" and "Schedule a Report" buttons are dead — they don't open anything. This feature adds the full creation/edit form.

### Implementation

**New files:**
- `src/components/dashboard/reports/scheduled/ScheduleReportForm.tsx` — Full form inside a `PremiumFloatingPanel`:
  - **Report selection**: Multi-select checklist (same catalog as batch download) — allows scheduling multiple reports in one delivery
  - **Schedule**: Frequency (daily/weekly/monthly/1st of month/end of month), day-of-week (for weekly), time, timezone selector
  - **Recipients**: Add by selecting from org admin/staff list (pulls from `employee_profiles` where `is_active = true`), or type an external email. Shows name + email for each recipient.
  - **Format**: PDF (single merged) or PDF (separate per report)
  - **Name**: Auto-generated from selections but editable

**Edited files:**
- `ScheduledReportsSubTab.tsx` — Wire "Schedule a Report" button to open the form
- `ScheduledReportsManager.tsx` — Wire "Schedule Report" and "Edit" buttons to the form
- `useScheduledReports.ts` — Add `report_ids` field to the `filters` JSONB (stores array of selected report IDs); no schema change needed since `filters` is already JSONB

---

## Feature 3: Auto-Deactivation on Staff Archive/Removal

### What it does
When a staff member is archived (`is_active = false`) or removed from the organization, any `scheduled_reports` where they are a recipient must:
1. Remove them from the `recipients` JSONB array
2. If no recipients remain, set `is_active = false`
3. Notify the report creator that a recipient was removed

### Implementation

**Database migration — 1 trigger function:**

```sql
CREATE OR REPLACE FUNCTION public.cleanup_scheduled_report_recipients()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_report RECORD;
  v_new_recipients JSONB;
  v_user_email TEXT;
BEGIN
  -- Only fire when staff is deactivated or removed
  IF (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true)
     OR (TG_OP = 'DELETE') THEN
    
    v_user_email := COALESCE(
      CASE WHEN TG_OP = 'DELETE' THEN OLD.email ELSE NEW.email END,
      ''
    );
    
    FOR v_report IN
      SELECT id, recipients, created_by
      FROM public.scheduled_reports
      WHERE organization_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END)
        AND is_active = true
    LOOP
      -- Remove recipient matching userId or email
      v_new_recipients := (
        SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
        FROM jsonb_array_elements(v_report.recipients) r
        WHERE r->>'userId' IS DISTINCT FROM (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)::text
          AND (r->>'email' IS DISTINCT FROM v_user_email OR v_user_email = '')
      );
      
      IF v_new_recipients IS DISTINCT FROM v_report.recipients THEN
        UPDATE public.scheduled_reports
        SET recipients = v_new_recipients,
            is_active = CASE WHEN jsonb_array_length(v_new_recipients) = 0 THEN false ELSE is_active END
        WHERE id = v_report.id;
        
        -- Notify creator
        INSERT INTO public.platform_notifications (
          recipient_id, type, severity, title, message, link
        ) VALUES (
          v_report.created_by, 'scheduled_report_recipient_removed', 'warning',
          'Scheduled Report Updated',
          'A recipient was removed from "' || (SELECT name FROM scheduled_reports WHERE id = v_report.id) || '" because they are no longer active.',
          '/dashboard/admin/reports'
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cleanup_scheduled_recipients
AFTER UPDATE OF is_active OR DELETE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.cleanup_scheduled_report_recipients();
```

---

## Summary

| Category | Action | Files |
|---|---|---|
| Batch Download | Report Pack dialog + PDF merge/ZIP | 3 new + 2 edited |
| Schedule Creator | Full form for creating/editing schedules | 1 new + 3 edited |
| Auto-Deactivation | DB trigger on employee_profiles | 1 migration |
| Dependencies | `jszip` package | package.json |
| **Total** | | 4 new files, 5 edited, 1 migration |

No breaking changes. All existing scheduled report data is preserved — `report_ids` is stored inside the existing `filters` JSONB column.

