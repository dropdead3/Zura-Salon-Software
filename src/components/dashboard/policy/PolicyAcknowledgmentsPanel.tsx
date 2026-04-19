/**
 * Wave 28.10 — Operator-side acknowledgment visibility.
 *
 * Lists clients who have acknowledged this policy. Provides CSV export.
 * Read via RLS — only org members see their organization's data.
 */
import { useMemo } from 'react';
import { Loader2, Download, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { usePolicyAcknowledgmentList } from '@/hooks/policy/usePolicyAcknowledgments';
import { buildCsvString } from '@/utils/csvExport';

interface Props {
  policyId: string | null;
  policyTitle: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PolicyAcknowledgmentsPanel({ policyId, policyTitle }: Props) {
  const { data: rows = [], isLoading } = usePolicyAcknowledgmentList(policyId);

  const handleExport = useMemo(() => {
    return () => {
      const headers = ['Name', 'Email', 'Signature', 'Method', 'IP', 'Acknowledged at'];
      const body = rows.map((r) => [
        r.client_name,
        r.client_email,
        r.signature_text,
        r.acknowledgment_method,
        r.ip_address ?? '',
        r.acknowledged_at,
      ]);
      const csv = buildCsvString([headers, ...body]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = policyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      a.download = `acknowledgments-${slug || 'policy'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  }, [rows, policyTitle]);

  if (!policyId) {
    return (
      <p className="font-sans text-sm text-muted-foreground py-6">
        Save the policy before viewing acknowledgments.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-muted-foreground" />
          <span className="font-sans text-sm">
            <span className="text-foreground font-medium">{rows.length}</span>{' '}
            <span className="text-muted-foreground">
              acknowledgment{rows.length === 1 ? '' : 's'}
            </span>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="font-sans"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          <p className="font-sans text-sm text-muted-foreground">
            No acknowledgments recorded yet.
          </p>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            Clients will appear here after acknowledging on the public Policy Center.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className={tokens.table.columnHeader}>Name</th>
                <th className={tokens.table.columnHeader}>Email</th>
                <th className={tokens.table.columnHeader}>Method</th>
                <th className={tokens.table.columnHeader}>Acknowledged</th>
                <th className={tokens.table.columnHeader}>IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-sans text-sm text-foreground">
                    {r.client_name}
                  </td>
                  <td className="px-4 py-2.5 font-sans text-sm text-muted-foreground">
                    {r.client_email}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="font-sans text-[10px]">
                      {r.acknowledgment_method.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-sans text-sm text-muted-foreground">
                    {formatDate(r.acknowledged_at)}
                  </td>
                  <td className="px-4 py-2.5 font-sans text-xs text-muted-foreground">
                    {r.ip_address ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
