import { useState } from 'react';
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlatformTable, PlatformTableBody, PlatformTableCell,
  PlatformTableHead, PlatformTableHeader, PlatformTableRow,
} from '@/components/platform/ui/PlatformTable';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  useAllTerminalRequests,
  useUpdateTerminalRequest,
  type TerminalHardwareRequest,
} from '@/hooks/useTerminalRequests';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; variant: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', variant: 'bg-amber-500/10 text-amber-500 border-amber-500/30', icon: Clock },
  approved: { label: 'Approved', variant: 'bg-blue-500/10 text-blue-500 border-blue-500/30', icon: CheckCircle2 },
  shipped: { label: 'Shipped', variant: 'bg-violet-500/10 text-violet-500 border-violet-500/30', icon: Truck },
  delivered: { label: 'Delivered', variant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 },
  denied: { label: 'Denied', variant: 'bg-red-500/10 text-red-500 border-red-500/30', icon: XCircle },
};

const REASON_LABELS: Record<string, string> = {
  new_location: 'New Location',
  replacement: 'Replacement',
  additional: 'Additional',
  other: 'Other',
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.variant} hover:${config.variant} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface ManageDialogProps {
  request: TerminalHardwareRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ManageRequestDialog({ request, open, onOpenChange }: ManageDialogProps) {
  const [status, setStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const updateRequest = useUpdateTerminalRequest();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && request) {
      setStatus(request.status);
      setTrackingNumber(request.tracking_number || '');
      setAdminNotes(request.admin_notes || '');
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!request) return;
    updateRequest.mutate(
      {
        requestId: request.id,
        status,
        adminNotes,
        trackingNumber,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border))]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--platform-foreground))]">
            Manage Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[hsl(var(--platform-foreground-muted))]">Organization</span>
              <p className="text-[hsl(var(--platform-foreground))]">{request.organization_name || '—'}</p>
            </div>
            <div>
              <span className="text-[hsl(var(--platform-foreground-muted))]">Location</span>
              <p className="text-[hsl(var(--platform-foreground))]">{request.location_name || '—'}</p>
            </div>
            <div>
              <span className="text-[hsl(var(--platform-foreground-muted))]">Reason</span>
              <p className="text-[hsl(var(--platform-foreground))]">{REASON_LABELS[request.reason] || request.reason}</p>
            </div>
            <div>
              <span className="text-[hsl(var(--platform-foreground-muted))]">Quantity</span>
              <p className="text-[hsl(var(--platform-foreground))]">{request.quantity}</p>
            </div>
            {request.notes && (
              <div className="col-span-2">
                <span className="text-[hsl(var(--platform-foreground-muted))]">Org Notes</span>
                <p className="text-[hsl(var(--platform-foreground))] text-sm">{request.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[hsl(var(--platform-foreground-muted))]">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-[hsl(var(--platform-bg))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[hsl(var(--platform-foreground-muted))]">Tracking Number</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number..."
              className="bg-[hsl(var(--platform-bg))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[hsl(var(--platform-foreground-muted))]">Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
              className="bg-[hsl(var(--platform-bg))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))]"
            />
          </div>
        </div>

        <DialogFooter>
          <PlatformButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </PlatformButton>
          <PlatformButton onClick={handleSave} disabled={updateRequest.isPending}>
            {updateRequest.isPending ? 'Saving...' : 'Save Changes'}
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TerminalRequestsTable() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: requests, isLoading } = useAllTerminalRequests(statusFilter !== 'all' ? statusFilter : undefined);
  const [manageTarget, setManageTarget] = useState<TerminalHardwareRequest | null>(null);

  const pendingCount = requests?.filter((r) => r.status === 'pending').length || 0;

  return (
    <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.6)] backdrop-blur-sm">
      <div className="p-5 flex items-center justify-between border-b border-[hsl(var(--platform-border)/0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <Package className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-medium text-[hsl(var(--platform-foreground))]">
              Terminal Hardware Requests
            </h3>
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              Incoming requests from organizations for terminal hardware
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 ml-2">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-[hsl(var(--platform-bg))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full bg-[hsl(var(--platform-bg-hover)/0.3)]" />
          ))}
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="p-10 text-center">
          <Package className="w-8 h-8 text-[hsl(var(--platform-foreground-muted))] mx-auto mb-3" />
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
            No terminal hardware requests found
          </p>
        </div>
      ) : (
        <PlatformTable>
          <PlatformTableHeader>
            <PlatformTableRow>
              <PlatformTableHead>Organization</PlatformTableHead>
              <PlatformTableHead>Location</PlatformTableHead>
              <PlatformTableHead>Reason</PlatformTableHead>
              <PlatformTableHead className="text-center">Qty</PlatformTableHead>
              <PlatformTableHead>Status</PlatformTableHead>
              <PlatformTableHead>Tracking</PlatformTableHead>
              <PlatformTableHead>Requested</PlatformTableHead>
              <PlatformTableHead className="text-right">Actions</PlatformTableHead>
            </PlatformTableRow>
          </PlatformTableHeader>
          <PlatformTableBody>
            {requests.map((req) => (
              <PlatformTableRow key={req.id}>
                <PlatformTableCell className="font-medium text-[hsl(var(--platform-foreground))]">
                  {req.organization_name || '—'}
                </PlatformTableCell>
                <PlatformTableCell>{req.location_name || '—'}</PlatformTableCell>
                <PlatformTableCell>{REASON_LABELS[req.reason] || req.reason}</PlatformTableCell>
                <PlatformTableCell className="text-center">{req.quantity}</PlatformTableCell>
                <PlatformTableCell><StatusBadge status={req.status} /></PlatformTableCell>
                <PlatformTableCell>
                  {req.tracking_number ? (
                    <span className="font-mono text-xs">{req.tracking_number}</span>
                  ) : (
                    <span className="text-[hsl(var(--platform-foreground-muted))]">—</span>
                  )}
                </PlatformTableCell>
                <PlatformTableCell className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                  {format(new Date(req.created_at), 'MMM d, yyyy')}
                </PlatformTableCell>
                <PlatformTableCell className="text-right">
                  <PlatformButton
                    variant="outline"
                    size="sm"
                    onClick={() => setManageTarget(req)}
                  >
                    Manage
                  </PlatformButton>
                </PlatformTableCell>
              </PlatformTableRow>
            ))}
          </PlatformTableBody>
        </PlatformTable>
      )}

      <ManageRequestDialog
        request={manageTarget}
        open={!!manageTarget}
        onOpenChange={(open) => { if (!open) setManageTarget(null); }}
      />
    </div>
  );
}
