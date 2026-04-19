/**
 * Wave 28.10 — AcknowledgeIdentityModal
 *
 * Lightweight identity capture for first-time policy acknowledgers on the
 * public Policy Center. Asks for name + email, persists to localStorage for
 * the rest of the session (reused across multiple acknowledgments). No account
 * creation required.
 */
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
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'zura.policy-ack.identity';

export interface AckIdentity {
  name: string;
  email: string;
}

export function loadStoredIdentity(): AckIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === 'string' && typeof parsed.email === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeIdentity(identity: AckIdentity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // ignore
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (identity: AckIdentity) => void;
  initialName?: string;
  initialEmail?: string;
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function AcknowledgeIdentityModal({
  open,
  onOpenChange,
  onConfirm,
  initialName = '',
  initialEmail = '',
}: Props) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = loadStoredIdentity();
      if (stored) {
        setName((n) => n || stored.name);
        setEmail((e) => e || stored.email);
      }
    }
  }, [open]);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= 200;
  const emailValid = isValidEmail(trimmedEmail) && trimmedEmail.length <= 255;
  const canSubmit = nameValid && emailValid;

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    const identity = { name: trimmedName, email: trimmedEmail.toLowerCase() };
    storeIdentity(identity);
    onConfirm(identity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide uppercase text-base">
            Confirm your details
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            We record your acknowledgment against your name and email. Used only for
            policy records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ack-name" className="font-sans text-xs text-muted-foreground">
              Full name
            </Label>
            <Input
              id="ack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className={cn(touched && !nameValid && 'border-destructive')}
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ack-email" className="font-sans text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="ack-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(touched && !emailValid && 'border-destructive')}
              autoComplete="email"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
