/**
 * WasteRecordDialog — Dialog for recording waste events.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManualWeightInput } from './ManualWeightInput';
import { WASTE_CATEGORY_LABELS, type WasteCategory } from '@/hooks/backroom/useWasteEvents';

interface WasteRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (category: WasteCategory, quantity: number, unit: string, notes: string) => void;
}

export function WasteRecordDialog({ open, onOpenChange, onSubmit }: WasteRecordDialogProps) {
  const [category, setCategory] = useState<WasteCategory>('leftover_bowl_waste');
  const [quantity, setQuantity] = useState<number | null>(null);
  const [unit, setUnit] = useState('g');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!quantity || quantity <= 0) return;
    onSubmit(category, quantity, unit, notes);
    setCategory('leftover_bowl_waste');
    setQuantity(null);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">Record Waste</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="font-sans text-sm">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as WasteCategory)}>
              <SelectTrigger className="h-11 font-sans">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(WASTE_CATEGORY_LABELS) as [WasteCategory, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ManualWeightInput
            onSubmit={(w, u) => {
              setQuantity(w);
              setUnit(u);
            }}
            label="Waste amount"
          />

          {quantity != null && (
            <p className="font-sans text-sm text-muted-foreground">
              Captured: {quantity.toFixed(1)}{unit}
            </p>
          )}

          <div>
            <Label className="font-sans text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any relevant details..."
              className="font-sans text-sm"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!quantity || quantity <= 0} className="font-sans">
            Record Waste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
