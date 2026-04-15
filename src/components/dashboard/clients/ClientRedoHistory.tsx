import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

interface ClientRedoHistoryProps {
  clientId: string;
}

export function ClientRedoHistory({ clientId }: ClientRedoHistoryProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrencyWhole } = useFormatCurrency();

  const { data: redos = [], isLoading } = useQuery({
    queryKey: ['client-redo-history', clientId],
    queryFn: async () => {
      // Query from phorest_appointments (where redo metadata is written by the edge function)
      // First get the phorest_client_id from the client record
      const { data: clientRow } = await supabase
        .from('v_all_clients' as any)
        .select('phorest_client_id')
        .eq('id', clientId)
        .maybeSingle();
      const client = clientRow as any;

      if (!client?.phorest_client_id) {
        // Fallback: try appointments table with client_id
        const { data } = await supabase
          .from('appointments')
          .select('id, service_name, appointment_date, staff_name, total_price, original_price, redo_reason, status')
          .eq('client_id', clientId)
          .eq('is_redo', true)
          .order('appointment_date', { ascending: false })
          .limit(50);
        return (data || []) as any[];
      }

      const { data: rawData } = await supabase
        .from('v_all_appointments' as any)
        .select('id, service_name, appointment_date, stylist_user_id, total_price, original_price, redo_reason, status')
        .eq('phorest_client_id', client.phorest_client_id)
        .eq('is_redo', true)
        .order('appointment_date', { ascending: false })
        .limit(50);

      const rows = (rawData || []) as any[];
      if (!rows.length) return [];

      // Resolve stylist names
      const stylistIds = [...new Set(rows.map((a: any) => a.stylist_user_id).filter(Boolean))] as string[];
      let nameMap: Record<string, string> = {};
      if (stylistIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', stylistIds);
        for (const p of profiles || []) {
          nameMap[p.user_id] = p.display_name || p.full_name || 'Unknown';
        }
      }

      return rows.map((r: any) => ({
        ...r,
        staff_name: r.stylist_user_id ? nameMap[r.stylist_user_id] || null : null,
      }));
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-8" />;
  }

  if (redos.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No redo history for this client
      </div>
    );
  }

  const totalImpact = redos.reduce((sum, r) => {
    const orig = r.original_price ?? r.total_price ?? 0;
    const redo = r.total_price ?? 0;
    return sum + Math.max(0, orig - redo);
  }, 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{redos.length} redo{redos.length !== 1 ? 's' : ''}</span>
        {totalImpact > 0 && (
          <span className="text-muted-foreground">
            Revenue impact: <span className="font-medium text-amber-600 dark:text-amber-400">-{formatCurrencyWhole(totalImpact)}</span>
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {redos.map((redo) => (
          <div
            key={redo.id}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50"
          >
            <RotateCcw className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{redo.service_name || 'Service'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{redo.appointment_date}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {redo.staff_name && (
                  <span className="text-xs text-muted-foreground">{redo.staff_name}</span>
                )}
                {redo.redo_reason && (
                  <Badge variant="outline" className="text-[9px] h-4">
                    {redo.redo_reason}
                  </Badge>
                )}
              </div>
              {redo.total_price != null && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Charged: {formatCurrencyWhole(redo.total_price)}
                  {redo.original_price != null && redo.original_price !== redo.total_price && (
                    <span className="ml-1">(orig: {formatCurrencyWhole(redo.original_price)})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
