import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Printer, Loader2, User } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import type { StaffComplianceBreakdown, ComplianceLogItem, ComplianceSummary } from '@/hooks/backroom/useBackroomComplianceTracker';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { generateStaffComplianceReportPdf } from '@/utils/staffComplianceReportPdf';

interface StaffComplianceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffBreakdown: StaffComplianceBreakdown[];
  items: ComplianceLogItem[];
  summary: ComplianceSummary;
  dateFrom: string;
  dateTo: string;
}

export function StaffComplianceReportDialog({
  open,
  onOpenChange,
  staffBreakdown,
  items,
  summary,
  dateFrom,
  dateTo,
}: StaffComplianceReportDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const orgName = effectiveOrganization?.name ?? 'Organization';

  const selectedStaff = staffBreakdown.find((s) => s.staffUserId === selectedStaffId);
  const staffItems = items.filter((i) => i.staffUserId === selectedStaffId);

  const handleGenerate = async (mode: 'download' | 'print') => {
    if (!selectedStaff) return;
    setGenerating(true);
    try {
      const doc = generateStaffComplianceReportPdf({
        orgName,
        staffName: selectedStaff.staffName,
        staffBreakdown: selectedStaff,
        items: staffItems,
        dateFrom,
        dateTo,
      });

      if (mode === 'print') {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open(url);
        if (win) {
          win.addEventListener('load', () => win.print());
        }
      } else {
        doc.save(`compliance-report-${selectedStaff.staffName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        toast.success('Report downloaded');
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>Staff Compliance Report</DialogTitle>
          <DialogDescription>
            Generate a compliance report for a 1:1 coaching session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="font-sans text-sm text-muted-foreground">Select Staff Member</label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-full">
                <User className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
                <SelectValue placeholder="Choose a team member..." />
              </SelectTrigger>
              <SelectContent>
                {staffBreakdown.map((s) => (
                  <SelectItem key={s.staffUserId} value={s.staffUserId}>
                    {s.staffName} — {s.complianceRate}% compliance
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="font-sans text-sm text-muted-foreground">Period</label>
            <p className="font-sans text-sm">{dateFrom} → {dateTo}</p>
          </div>

          {selectedStaff && (
            <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
              <p className="font-sans text-sm"><span className="text-muted-foreground">Compliance Rate:</span> {selectedStaff.complianceRate}%</p>
              <p className="font-sans text-sm"><span className="text-muted-foreground">Appointments:</span> {selectedStaff.total} ({selectedStaff.missing} missing)</p>
              <p className="font-sans text-sm"><span className="text-muted-foreground">Waste Rate:</span> {selectedStaff.wastePct}%</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('print')}
              disabled={!selectedStaff || generating}
            >
              {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
              Print
            </Button>
            <Button
              size="sm"
              onClick={() => handleGenerate('download')}
              disabled={!selectedStaff || generating}
            >
              {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
