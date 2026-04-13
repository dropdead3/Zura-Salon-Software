import { useState, useCallback, useMemo } from 'react';
import { isCardExpired } from '@/lib/card-utils';
import { format, subDays } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useTillReconciliation } from '@/hooks/useTillReconciliation';
import { useTerminalDeposit } from '@/hooks/useTerminalDeposit';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { AlertDialogAction } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Banknote,
  CreditCard,
  RefreshCw,
  ArrowLeft,
  Calendar,
  HandCoins,
  UserX,
  Receipt,
  Plus,
  Search,
} from 'lucide-react';

// ─── Fee Ledger Sub-component ─────────────────────────────────
const FEE_STATUS_FILTERS = ['pending', 'collected', 'waived'] as const;
type FeeStatusFilter = typeof FEE_STATUS_FILTERS[number];

const FEE_TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  no_show: 'No Show',
  cancellation: 'Cancellation',
  manual: 'Manual',
};

const COLLECTED_VIA_LABELS: Record<string, string> = {
  online_booking: 'Online',
  card_on_file: 'Card on File',
};

function FeeLedgerCard({ orgId, formatCurrency }: { orgId?: string; formatCurrency: (n: number) => string }) {
  const [statusFilter, setStatusFilter] = useState<FeeStatusFilter>('pending');
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<{ id: string; clientName: string; amount: number } | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [collectingCharge, setCollectingCharge] = useState<{
    id: string; clientName: string; amount: number; feeType: string; appointmentId: string; clientId: string | null;
  } | null>(null);
  const [clientCard, setClientCard] = useState<{ brand: string; last4: string; exp_month: number; exp_year: number } | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const queryClient = useQueryClient();

  // Add Fee state
  const [addFeeDialogOpen, setAddFeeDialogOpen] = useState(false);
  const [addFeeSearch, setAddFeeSearch] = useState('');
  const [addFeeType, setAddFeeType] = useState('manual');
  const [addFeeAmount, setAddFeeAmount] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<{ id: string; client_name: string; appointment_date: string } | null>(null);

  const debouncedSearch = useDebounce(addFeeSearch, 300);

  const { data: appointmentSearchResults = [] } = useQuery({
    queryKey: ['add-fee-appointment-search', orgId, debouncedSearch],
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      const { data, error } = await (supabase
        .from('phorest_appointments')
        .select('id, client_name, appointment_date')
        .eq('organization_id', orgId!)
        .gte('appointment_date', cutoff)
        .ilike('client_name', `%${debouncedSearch}%`)
        .order('appointment_date', { ascending: false })
        .limit(10) as any);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; client_name: string | null; appointment_date: string }>;
    },
    enabled: !!orgId && debouncedSearch.length >= 2,
  });

  const addFeeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppointment || !addFeeAmount) throw new Error('Missing fields');
      const amount = parseFloat(addFeeAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
      const { error } = await supabase
        .from('appointment_fee_charges')
        .insert({
          organization_id: orgId!,
          appointment_id: selectedAppointment.id,
          fee_type: addFeeType,
          fee_amount: amount,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['fee-ledger-pending-count'] });
      toast.success('Fee charge added');
      resetAddFeeForm();
    },
    onError: (error) => {
      toast.error('Failed to add fee', { description: error.message });
    },
  });

  const resetAddFeeForm = useCallback(() => {
    setAddFeeDialogOpen(false);
    setAddFeeSearch('');
    setAddFeeType('manual');
    setAddFeeAmount('');
    setSelectedAppointment(null);
  }, []);

  const { data: feeCharges = [], isLoading } = useQuery({
    queryKey: ['fee-ledger', orgId, statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_fee_charges')
        .select(`
          id, fee_type, fee_amount, status, collected_via, charged_at, created_at, appointment_id,
          appointment:appointment_id (client_name, client_id, phorest_client_id, appointment_date, status)
        `)
        .eq('organization_id', orgId!)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        fee_type: string;
        fee_amount: number;
        status: string;
        collected_via: string | null;
        charged_at: string | null;
        created_at: string;
        appointment_id: string;
        appointment: { client_name: string | null; client_id: string | null; phorest_client_id: string | null; appointment_date: string; status: string | null } | null;
      }>;
    },
    enabled: !!orgId,
  });

  // Separate count query for pending badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['fee-ledger-pending-count', orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointment_fee_charges')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ chargeId, reason }: { chargeId: string; reason: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('appointment_fee_charges')
        .update({
          status: 'waived',
          waived_by: userId,
          waived_reason: reason,
        })
        .eq('id', chargeId)
        .eq('organization_id', orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['fee-ledger-pending-count'] });
      toast.success('Fee charge waived');
      setWaiveDialogOpen(false);
      setSelectedCharge(null);
      setWaiveReason('');
    },
    onError: (error) => {
      toast.error('Failed to waive fee', { description: error.message });
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (charge: { id: string; appointmentId: string; clientId: string | null; amount: number; feeType: string }) => {
      const { error } = await supabase.functions.invoke('charge-card-on-file', {
        body: {
          organization_id: orgId,
          appointment_id: charge.appointmentId,
          client_id: charge.clientId,
          amount: charge.amount,
          fee_type: charge.feeType,
          fee_charge_id: charge.id,
          description: `${FEE_TYPE_LABELS[charge.feeType] ?? charge.feeType} fee collection`,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['fee-ledger-pending-count'] });
      toast.success('Fee charge collected');
      setCollectDialogOpen(false);
      setCollectingCharge(null);
      setClientCard(null);
    },
    onError: (error) => {
      toast.error('Failed to collect fee', { description: error.message });
    },
  });

  const openCollectDialog = useCallback(async (charge: {
    id: string; clientName: string; amount: number; feeType: string; appointmentId: string; clientId: string | null;
  }) => {
    if (!charge.clientId) {
      toast.error('No client linked to this appointment');
      return;
    }
    setCardLoading(true);
    setCollectingCharge(charge);
    setCollectDialogOpen(true);

    const { data: card } = await supabase
      .from('client_cards_on_file')
      .select('card_brand, card_last4, card_exp_month, card_exp_year')
      .eq('organization_id', orgId!)
      .eq('client_id', charge.clientId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();

    if (card) {
      setClientCard({ brand: card.card_brand ?? '', last4: card.card_last4 ?? '', exp_month: card.card_exp_month ?? 0, exp_year: card.card_exp_year ?? 0 });
    } else {
      setClientCard(null);
    }
    setCardLoading(false);
  }, [orgId]);

  const openWaiveDialog = useCallback((charge: { id: string; clientName: string; amount: number }) => {
    setSelectedCharge(charge);
    setWaiveReason('');
    setWaiveDialogOpen(true);
  }, []);

  const cardExpired = clientCard ? isCardExpired(clientCard.exp_month, clientCard.exp_year) : false;

  const isPending = statusFilter === 'pending';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Receipt className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>
                Fee Charges
                <MetricInfoTooltip description="Unified ledger of all appointment-related fee charges including deposits, cancellation fees, no-show fees, and manual charges." />
              </CardTitle>
              <CardDescription>Audit trail for deposits, cancellations, and no-show fees</CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-auto">{pendingCount} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status filter tabs */}
          <div className="flex gap-1 p-1 bg-muted/70 rounded-lg w-fit">
            {FEE_STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize',
                  statusFilter === s
                    ? 'bg-background shadow-sm ring-1 ring-border/50 text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : feeCharges.length === 0 ? (
            <div className={tokens.empty.container}>
              <Receipt className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No {statusFilter} fees</h3>
              <p className={tokens.empty.description}>
                {statusFilter === 'pending'
                  ? 'No fees are awaiting collection.'
                  : `No ${statusFilter} fee records found.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Client</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Fee Type</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Amount</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Collected Via</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Charged At</TableHead>
                  {isPending && <TableHead className={tokens.table.columnHeader}>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeCharges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">
                      {charge.appointment?.client_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {charge.appointment?.appointment_date
                        ? format(new Date(charge.appointment.appointment_date), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FEE_TYPE_LABELS[charge.fee_type] ?? charge.fee_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <BlurredAmount>{formatCurrency(charge.fee_amount)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {charge.collected_via
                        ? COLLECTED_VIA_LABELS[charge.collected_via] ?? charge.collected_via
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {charge.charged_at
                        ? format(new Date(charge.charged_at), 'MMM d, h:mm a')
                        : '—'}
                    </TableCell>
                    {isPending && (
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className={tokens.button.inline}
                            disabled={collectMutation.isPending}
                            onClick={() => openCollectDialog({
                              id: charge.id,
                              clientName: charge.appointment?.client_name || 'Unknown',
                              amount: charge.fee_amount,
                              feeType: charge.fee_type,
                              appointmentId: charge.appointment_id,
                              clientId: charge.appointment?.client_id ?? charge.appointment?.phorest_client_id ?? null,
                            })}
                          >
                            Collect
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className={tokens.button.inline}
                            onClick={() => openWaiveDialog({
                              id: charge.id,
                              clientName: charge.appointment?.client_name || 'Unknown',
                              amount: charge.fee_amount,
                            })}
                          >
                            Waive
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Waive confirmation dialog */}
      <AlertDialog open={waiveDialogOpen} onOpenChange={setWaiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Waive Fee Charge</AlertDialogTitle>
            <AlertDialogDescription>
              This will waive the <strong>{formatCurrency(selectedCharge?.amount ?? 0)}</strong> fee for{' '}
              <strong>{selectedCharge?.clientName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Reason for waiving <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Client called ahead, extenuating circumstances"
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              autoCapitalize="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={waiveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!waiveReason.trim() || waiveMutation.isPending}
              onClick={() => {
                if (selectedCharge && waiveReason.trim()) {
                  waiveMutation.mutate({ chargeId: selectedCharge.id, reason: waiveReason.trim() });
                }
              }}
              className={cn(waiveMutation.isPending && 'opacity-70')}
            >
              {waiveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirm Waive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Collect confirmation dialog */}
      <AlertDialog open={collectDialogOpen} onOpenChange={(open) => { if (!open) { setCollectDialogOpen(false); setCollectingCharge(null); setClientCard(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Collect Fee Charge</AlertDialogTitle>
            <AlertDialogDescription>
              Charge <strong>{formatCurrency(collectingCharge?.amount ?? 0)}</strong>{' '}
              ({FEE_TYPE_LABELS[collectingCharge?.feeType ?? ''] ?? collectingCharge?.feeType}) to{' '}
              <strong>{collectingCharge?.clientName}</strong>'s card on file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            {cardLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Looking up card…
              </div>
            ) : clientCard ? (
              <div className="text-sm">
                <span className="font-medium">{clientCard.brand || 'Card'}</span> ending in{' '}
                <span className="font-medium">{clientCard.last4}</span>
                {cardExpired && (
                  <Badge variant="destructive" className="ml-2 text-xs">Expired</Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" /> No card on file found for this client.
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={collectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!clientCard || cardExpired || collectMutation.isPending || cardLoading}
              onClick={() => {
                if (collectingCharge && clientCard && !cardExpired) {
                  collectMutation.mutate({
                    id: collectingCharge.id,
                    appointmentId: collectingCharge.appointmentId,
                    clientId: collectingCharge.clientId,
                    amount: collectingCharge.amount,
                    feeType: collectingCharge.feeType,
                  });
                }
              }}
              className={cn(collectMutation.isPending && 'opacity-70')}
            >
              {collectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirm Charge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function PaymentOps() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { formatCurrency } = useFormatCurrency();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const initialDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'capture' | 'release' | 'refund';
    id: string;
    label: string;
    amount?: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { reconcile, result: reconciliation, isLoading: isReconciling } = useTillReconciliation(orgId);
  const { captureDeposit, cancelDeposit } = useTerminalDeposit();

  // Active deposit holds
  const { data: depositHolds = [], isLoading: holdsLoading } = useQuery({
    queryKey: ['active-deposit-holds', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, appointment_date, deposit_amount, deposit_status, deposit_stripe_payment_id, staff_name')
        .eq('organization_id', orgId!)
        .eq('deposit_status', 'held')
        .not('deposit_stripe_payment_id', 'is', null)
        .order('appointment_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Pending refunds
  const { data: pendingRefunds = [], isLoading: refundsLoading } = useQuery({
    queryKey: ['pending-refunds', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refund_records')
        .select('id, original_item_name, refund_amount, refund_type, reason, created_at, original_transaction_id')
        .eq('organization_id', orgId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const handleReconcile = () => {
    reconcile(selectedDate);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction || !orgId) return;
    setIsProcessing(true);
    try {
      if (confirmAction.type === 'capture') {
        await captureDeposit(orgId, confirmAction.id);
        queryClient.invalidateQueries({ queryKey: ['active-deposit-holds', orgId] });
      } else if (confirmAction.type === 'release') {
        await cancelDeposit(orgId, confirmAction.id);
        queryClient.invalidateQueries({ queryKey: ['active-deposit-holds', orgId] });
      } else if (confirmAction.type === 'refund') {
        // B3 fix: pass original_transaction_id and amount so edge function can look up PI
        const refund = pendingRefunds.find((r) => r.id === confirmAction.id);
        const body: Record<string, unknown> = {
          refund_record_id: confirmAction.id,
          organization_id: orgId,
          original_transaction_id: refund?.original_transaction_id || null,
          amount: refund?.refund_amount || 0,
        };
        const { error } = await supabase.functions.invoke('process-stripe-refund', { body });
        if (error) throw error;
        toast.success('Refund processed');
        queryClient.invalidateQueries({ queryKey: ['pending-refunds', orgId] });
      }
    } catch (err) {
      const verb = confirmAction.type === 'capture' ? 'capture deposit' : confirmAction.type === 'release' ? 'release deposit' : 'process refund';
      toast.error(`Failed to ${verb}`, { description: (err as Error).message });
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const stripeCardTotal = reconciliation
    ? reconciliation.stripe.net_amount_cents / 100
    : null;

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, 'max-w-[1600px] mx-auto')}>
        <DashboardPageHeader
          title="Payment Operations"
          description="Till reconciliation, deposit holds, and refund processing"
          backTo={dashPath('/admin/team-hub')}
          backLabel="Operations Hub"
        />

        <div className="space-y-6">
          {/* Till Reconciliation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <ShieldCheck className={tokens.card.icon} />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>
                      Till Reconciliation
                      <MetricInfoTooltip description="Cross-references local card payment records against Stripe's actual PaymentIntent data to identify discrepancies." />
                    </CardTitle>
                    <CardDescription>Verify card payments against Stripe records</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-9 pl-9 pr-3 rounded-full border border-input bg-background text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleReconcile}
                    disabled={isReconciling}
                    size="sm"
                    className="rounded-full"
                  >
                    {isReconciling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Reconcile
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!reconciliation ? (
                <div className={tokens.empty.container}>
                  <ShieldCheck className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No reconciliation run yet</h3>
                  <p className={tokens.empty.description}>
                    Select a date and click Reconcile to verify card payments against Stripe.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={cn(
                      'rounded-xl border px-5 py-4',
                      reconciliation.is_reconciled
                        ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {reconciliation.is_reconciled ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="w-5 h-5" />
                          <span className="font-medium text-sm">All payments reconciled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-medium text-sm">Discrepancies found</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stripe total:</span>{' '}
                        <span className="font-medium">
                          <BlurredAmount>{formatCurrency(stripeCardTotal ?? 0)}</BlurredAmount>
                        </span>
                        <span className="text-muted-foreground ml-1">
                          ({reconciliation.stripe.total_payments} payments)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Local matched:</span>{' '}
                        <span className="font-medium">{reconciliation.local.matched_count} records</span>
                      </div>
                      {(reconciliation.local as any).matched_amount_cents != null && (
                        <div>
                          <span className="text-muted-foreground">Local total:</span>{' '}
                          <span className="font-medium">
                            <BlurredAmount>
                              {formatCurrency((reconciliation.local as any).matched_amount_cents / 100)}
                            </BlurredAmount>
                          </span>
                        </div>
                      )}
                      {reconciliation.stripe.total_tips_cents > 0 && (
                        <div>
                          <span className="text-muted-foreground">Tips:</span>{' '}
                          <span className="font-medium">
                            <BlurredAmount>
                              {formatCurrency(reconciliation.stripe.total_tips_cents / 100)}
                            </BlurredAmount>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discrepancy tables */}
                  {!reconciliation.is_reconciled && (
                    <div className="space-y-4">
                      {reconciliation.discrepancies.unmatched_stripe.length > 0 && (
                        <div>
                          <h4 className="font-display text-xs tracking-wide text-amber-700 dark:text-amber-400 mb-2">
                            IN STRIPE BUT NOT LOCAL
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className={tokens.table.columnHeader}>Payment Intent</TableHead>
                                <TableHead className={tokens.table.columnHeader}>Amount</TableHead>
                                <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                                <TableHead className={tokens.table.columnHeader}>Created</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reconciliation.discrepancies.unmatched_stripe.map((pi) => (
                                <TableRow key={pi.id}>
                                  <TableCell className="font-mono text-xs">{pi.id}</TableCell>
                                  <TableCell>
                                    <BlurredAmount>{formatCurrency(pi.amount / 100)}</BlurredAmount>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{pi.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {format(new Date(pi.created * 1000), 'MMM d, h:mm a')}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {reconciliation.discrepancies.orphaned_local.length > 0 && (
                        <div>
                          <h4 className="font-display text-xs tracking-wide text-amber-700 dark:text-amber-400 mb-2">
                            IN LOCAL BUT NOT STRIPE
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className={tokens.table.columnHeader}>Appointment</TableHead>
                                <TableHead className={tokens.table.columnHeader}>Payment Intent</TableHead>
                                <TableHead className={tokens.table.columnHeader}>Local Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reconciliation.discrepancies.orphaned_local.map((item) => (
                                <TableRow key={item.appointment_id}>
                                  <TableCell className="font-mono text-xs">
                                    {item.appointment_id.slice(0, 8)}…
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {item.stripe_payment_intent_id}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{item.local_status}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Deposit Holds */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <HandCoins className={tokens.card.icon} />
                </div>
                <div>
                  <CardTitle className={tokens.card.title}>
                    Active Deposit Holds
                    <MetricInfoTooltip description="Pre-authorized card holds for upcoming appointments. Capture to charge or release to cancel the hold." />
                  </CardTitle>
                  <CardDescription>Pre-authorized deposits awaiting capture or release</CardDescription>
                </div>
                {depositHolds.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{depositHolds.length} active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {holdsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className={tokens.loading.spinner} />
                </div>
              ) : depositHolds.length === 0 ? (
                <div className={tokens.empty.container}>
                  <HandCoins className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No active deposit holds</h3>
                  <p className={tokens.empty.description}>
                    Deposit holds will appear here when clients pre-authorize payments for appointments.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tokens.table.columnHeader}>Client</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Amount</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositHolds.map((hold) => (
                      <TableRow key={hold.id}>
                        <TableCell className="font-medium">{hold.client_name || 'Walk-in'}</TableCell>
                        <TableCell className="text-muted-foreground">{hold.staff_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(hold.appointment_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <BlurredAmount>{formatCurrency(hold.deposit_amount ?? 0)}</BlurredAmount>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className={tokens.button.inline}
                              onClick={() => setConfirmAction({
                                type: 'capture',
                                id: hold.deposit_stripe_payment_id!,
                                label: `Capture ${formatCurrency(hold.deposit_amount ?? 0)} deposit for ${hold.client_name || 'Walk-in'}`,
                                amount: hold.deposit_amount ?? 0,
                              })}
                            >
                              Capture
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={tokens.button.inline}
                              onClick={() => setConfirmAction({
                                type: 'release',
                                id: hold.deposit_stripe_payment_id!,
                                label: `Release ${formatCurrency(hold.deposit_amount ?? 0)} deposit for ${hold.client_name || 'Walk-in'}`,
                                amount: hold.deposit_amount ?? 0,
                              })}
                            >
                              Release
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Refunds */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <Banknote className={tokens.card.icon} />
                </div>
                <div>
                  <CardTitle className={tokens.card.title}>
                    Pending Refunds
                    <MetricInfoTooltip description="Refund requests awaiting processing. Click Process to submit the refund to Stripe." />
                  </CardTitle>
                  <CardDescription>Refund requests ready for processing</CardDescription>
                </div>
                {pendingRefunds.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{pendingRefunds.length} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {refundsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className={tokens.loading.spinner} />
                </div>
              ) : pendingRefunds.length === 0 ? (
                <div className={tokens.empty.container}>
                  <Banknote className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No pending refunds</h3>
                  <p className={tokens.empty.description}>
                    All refund requests have been processed.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tokens.table.columnHeader}>Item</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Amount</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Type</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Reason</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Requested</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRefunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell className="font-medium">
                          {refund.original_item_name || 'Unknown item'}
                        </TableCell>
                        <TableCell>
                          <BlurredAmount>{formatCurrency(refund.refund_amount)}</BlurredAmount>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{refund.refund_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {refund.reason || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {refund.created_at ? format(new Date(refund.created_at), 'MMM d') : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className={tokens.button.inline}
                            onClick={() => setConfirmAction({
                              type: 'refund',
                              id: refund.id,
                              label: `Process ${formatCurrency(refund.refund_amount)} refund for ${refund.original_item_name || 'Unknown item'}`,
                              amount: refund.refund_amount,
                            })}
                          >
                            Process
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Fee Ledger */}
          <FeeLedgerCard orgId={orgId} formatCurrency={formatCurrency} />
        </div>

        {/* E1: Confirmation dialog for destructive financial actions */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
          <AlertDialogContent style={{ left: 'calc(50% + var(--sidebar-offset, 0px))' }}>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <AlertDialogTitle className={tokens.drawer.title}>
                  Confirm {confirmAction?.type === 'capture' ? 'Capture' : confirmAction?.type === 'release' ? 'Release' : 'Refund'}
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className={tokens.body.muted}>
                {confirmAction?.label}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full" disabled={isProcessing}>Cancel</AlertDialogCancel>
              <Button
                onClick={executeConfirmedAction}
                disabled={isProcessing}
                className={cn(
                  'rounded-full',
                  confirmAction?.type === 'release' || confirmAction?.type === 'refund'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : ''
                )}
              >
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {confirmAction?.type === 'capture' ? 'Capture Deposit' : confirmAction?.type === 'release' ? 'Release Deposit' : 'Process Refund'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
