import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAdminSetUserPin } from '@/hooks/useUserPin';

export type AdminSetPinMode = 'set' | 'clear';

export interface AdminSetPinTarget {
  user_id: string;
  name: string;
  has_pin: boolean;
  is_primary_owner?: boolean;
}

interface AdminSetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: AdminSetPinTarget | null;
  mode: AdminSetPinMode;
}

/**
 * Shared dialog for admin Set / Change / Clear PIN flow.
 * Used by the Roster Table mode (inline action) and any future surface
 * that needs to mutate a team member's quick-login PIN.
 *
 * Single source of truth: writes through `useAdminSetUserPin` — the same
 * hook used by Team Member Detail → Security tab.
 */
export function AdminSetPinDialog({ open, onOpenChange, member, mode }: AdminSetPinDialogProps) {
  const adminSetPin = useAdminSetUserPin();
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [reason, setReason] = useState('');

  // Reset state when dialog opens for a new target
  useEffect(() => {
    if (open) {
      setNewPin('');
      setShowPin(false);
      setReason('');
    }
  }, [open, member?.user_id, mode]);

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setNewPin(cleaned);
  };

  const handleSubmit = async () => {
    if (!member) return;
    await adminSetPin.mutateAsync({
      targetUserId: member.user_id,
      pin: mode === 'clear' ? null : newPin,
      reason: reason || undefined,
    });
    onOpenChange(false);
  };

  const isClear = mode === 'clear';
  const isChange = !isClear && member?.has_pin;
  const isSet = !isClear && !member?.has_pin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isClear && <><Trash2 className="w-5 h-5" /> Clear PIN for {member?.name}</>}
            {isChange && <><Pencil className="w-5 h-5" /> Change PIN for {member?.name}</>}
            {isSet && <><Plus className="w-5 h-5" /> Set PIN for {member?.name}</>}
          </DialogTitle>
          <DialogDescription>
            {isClear
              ? 'This will remove the PIN and disable quick login for this user.'
              : isChange
                ? 'Enter a new 4-digit PIN to replace the existing one.'
                : 'Create a 4-digit PIN to enable quick login for this user.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isClear && (
            <div className="space-y-2">
              <Label htmlFor="admin-set-pin">New PIN</Label>
              <div className="relative">
                <Input
                  id="admin-set-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="Enter 4 digits"
                  className="pr-10 font-mono text-center text-lg tracking-widest"
                  autoCapitalize="off"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPin.length > 0 && newPin.length < 4 && (
                <p className="text-xs text-muted-foreground">PIN must be exactly 4 digits</p>
              )}
            </div>
          )}

          {isClear && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                This user will no longer be able to use quick PIN login until a new PIN is set.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-set-pin-reason">Reason (optional)</Label>
            <Input
              id="admin-set-pin-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., User forgot PIN"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(!isClear && newPin.length !== 4) || adminSetPin.isPending}
            variant={isClear ? 'destructive' : 'default'}
          >
            {adminSetPin.isPending
              ? 'Saving…'
              : isClear
                ? 'Clear PIN'
                : isChange
                  ? 'Update PIN'
                  : 'Set PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
