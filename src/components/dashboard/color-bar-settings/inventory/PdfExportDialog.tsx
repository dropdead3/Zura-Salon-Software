/**
 * PdfExportDialog — Export scope & format selector for inventory PDF downloads.
 * Shows location scope (current vs all) and format (separate vs combined) options.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileDown, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

export type ExportScope = 'current' | 'all';
export type ExportFormat = 'separate' | 'combined';

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: { id: string; name: string }[];
  currentLocationId?: string;
  currentLocationName?: string;
  onExport: (scope: ExportScope, format: ExportFormat) => void;
}

export function PdfExportDialog({
  open,
  onOpenChange,
  locations,
  currentLocationId,
  currentLocationName,
  onExport,
}: PdfExportDialogProps) {
  const [scope, setScope] = useState<ExportScope>('current');
  const [format, setFormat] = useState<ExportFormat>('separate');

  const isMultiLocation = locations.length > 1;

  const handleExport = () => {
    onExport(scope, format);
    onOpenChange(false);
    // Reset for next open
    setScope('current');
    setFormat('separate');
  };

  // Single location — export immediately without dialog
  // This is handled by the parent, but as a safety net:
  if (!isMultiLocation) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={tokens.heading.section}>Export PDF</DialogTitle>
          <DialogDescription className="font-sans text-muted-foreground">
            Choose which locations to include and how to deliver the files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Scope */}
          <div className="space-y-2.5">
            <Label className="font-sans text-sm text-muted-foreground">Location Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as ExportScope)} className="gap-2">
              <label
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                  scope === 'current' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value="current" id="scope-current" />
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-sans text-sm">Current Location Only</p>
                  {currentLocationName && (
                    <p className="font-sans text-xs text-muted-foreground truncate">{currentLocationName}</p>
                  )}
                </div>
              </label>
              <label
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                  scope === 'all' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value="all" id="scope-all" />
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-sans text-sm">All Locations</p>
                  <p className="font-sans text-xs text-muted-foreground">{locations.length} locations</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Step 2: Format (only when all locations selected) */}
          {scope === 'all' && (
            <div className="space-y-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <Label className="font-sans text-sm text-muted-foreground">Download Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)} className="gap-2">
                <label
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                    format === 'separate' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  )}
                >
                  <RadioGroupItem value="separate" id="format-separate" />
                  <div className="min-w-0">
                    <p className="font-sans text-sm">Separate Files</p>
                    <p className="font-sans text-xs text-muted-foreground">One PDF per location</p>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                    format === 'combined' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  )}
                >
                  <RadioGroupItem value="combined" id="format-combined" />
                  <div className="min-w-0">
                    <p className="font-sans text-sm">Combined File</p>
                    <p className="font-sans text-xs text-muted-foreground">All locations merged into one PDF</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans">
            Cancel
          </Button>
          <Button onClick={handleExport} className="font-sans gap-1.5">
            <FileDown className="w-4 h-4" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
