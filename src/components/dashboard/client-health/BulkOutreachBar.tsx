import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Download, X } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ShareToDMDialog } from '@/components/dashboard/sales/ShareToDMDialog';
import { EmailOutreachDialog } from './EmailOutreachDialog';
import type { HealthClient } from '@/hooks/useClientHealthSegments';

interface BulkOutreachBarProps {
  selectedClients: HealthClient[];
  segmentLabel: string;
  onClearSelection: () => void;
}

export function BulkOutreachBar({ selectedClients, segmentLabel, onClearSelection }: BulkOutreachBarProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  if (selectedClients.length === 0) return null;

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Last Visit', 'Days Inactive', 'Total Spend'];
    const rows = selectedClients.map(c => [
      c.name,
      c.email || '',
      c.phone || '',
      c.last_visit || '',
      String(c.days_inactive),
      String(c.total_spend),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-health-${segmentLabel.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareContent = selectedClients.slice(0, 10).map(c =>
    `• ${c.name} — last visit ${c.last_visit || 'unknown'}, ${formatCurrencyWhole(c.total_spend)} total`
  ).join('\n') + (selectedClients.length > 10 ? `\n...and ${selectedClients.length - 10} more` : '');

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedClients.length} selected</span>
          <Button variant="ghost" size={tokens.button.inline} onClick={onClearSelection} className="h-7 px-2">
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={() => setEmailDialogOpen(true)} className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={() => setShareDialogOpen(true)} className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Share with Staff
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <EmailOutreachDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        clients={selectedClients}
        segmentLabel={segmentLabel}
      />

      <ShareToDMDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        planTitle={`${segmentLabel} — ${selectedClients.length} clients`}
        planContent={`**${segmentLabel}**\n\n${shareContent}`}
      />
    </>
  );
}
