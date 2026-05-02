import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

/**
 * Exports the immutable review_compliance_log as CSV for audit purposes.
 * The log is append-only at the DB layer; this is a read-only export.
 */
export function ComplianceExportButton() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [busy, setBusy] = useState(false);

  const exportCsv = async () => {
    if (!orgId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('review_compliance_log' as any)
        .select('created_at, event_type, feedback_response_id, recovery_task_id, payload')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const header = ['created_at', 'event_type', 'feedback_response_id', 'recovery_task_id', 'payload'];
      const escape = (v: any) => {
        const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        header.join(','),
        ...rows.map((r) => header.map((k) => escape(r[k])).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} compliance events`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={exportCsv} disabled={busy} variant="outline" size="sm" className="gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export Compliance Log
    </Button>
  );
}
