import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (roleKey: string, roleLabel: string) => Promise<void> | void;
  pending?: boolean;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}

export function CustomRoleDialog({ open, onOpenChange, onConfirm, pending }: Props) {
  const [label, setLabel] = useState('');

  const handleConfirm = async () => {
    if (!label.trim()) return;
    const key = `custom_${slugify(label)}`;
    await onConfirm(key, label.trim());
    setLabel('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">Add Custom Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-sans">Role title</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Brand Ambassador"
              className="font-sans"
              autoFocus
            />
            <p className="font-sans text-xs text-muted-foreground">
              We'll create a handbook scoped to this role.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-sans">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!label.trim() || pending} className="font-sans">
            {pending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create handbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
