import { useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPinStatus, useSetUserPin } from '@/hooks/useUserPin';
import { useAuth } from '@/contexts/AuthContext';

export function UserPinSettings() {
  const { roles } = useAuth();
  const { data: pinStatus, isLoading } = useUserPinStatus();
  const setUserPin = useSetUserPin();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = roles.includes('admin');

  const handleSubmit = async () => {
    if (newPin !== confirmPin) {
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      return;
    }

    await setUserPin.mutateAsync({ pin: newPin });
    setDialogOpen(false);
    setNewPin('');
    setConfirmPin('');
  };

  const handlePinChange = (value: string, setter: (v: string) => void) => {
    // Only allow digits, max 4
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setter(cleaned);
  };

  const pinsMatch = newPin === confirmPin && newPin.length === 4;
  const pinValid = /^\d{4}$/.test(newPin);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">Quick Login PIN</CardTitle>
          </div>
          <CardDescription>
            Your 4-digit PIN for quick dashboard login on shared devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
            <div>
              <p className="font-medium text-sm">PIN Status</p>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : pinStatus?.hasPin ? 'PIN is set' : 'No PIN configured'}
              </p>
            </div>
            <Badge variant={pinStatus?.hasPin ? 'default' : 'secondary'}>
              {pinStatus?.hasPin ? 'Active' : 'Not Set'}
            </Badge>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setDialogOpen(true)}
          >
            <Lock className="w-4 h-4 mr-2" />
            {pinStatus?.hasPin ? 'Change PIN' : 'Set PIN'}
          </Button>

          {(isSuperAdmin || isAdmin) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                As a {isSuperAdmin ? 'Super Admin' : 'Admin'}, your PIN can also be used to access kiosk settings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {pinStatus?.hasPin ? 'Change Your PIN' : 'Set Your PIN'}
            </DialogTitle>
            <DialogDescription>
              Enter a 4-digit PIN for quick dashboard access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">New PIN</Label>
              <div className="relative">
                <Input
                  id="new-pin"
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => handlePinChange(e.target.value, setNewPin)}
                  placeholder="Enter 4 digits"
                  className="pr-10 font-mono text-center text-lg tracking-widest"
                  autoCapitalize="off"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPin(!showNewPin)}
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <div className="relative">
                <Input
                  id="confirm-pin"
                  type={showConfirmPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                  placeholder="Confirm 4 digits"
                  className="pr-10 font-mono text-center text-lg tracking-widest"
                  autoCapitalize="off"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {newPin.length === 4 && confirmPin.length === 4 && !pinsMatch && (
              <p className="text-sm text-destructive">PINs do not match</p>
            )}

            {pinsMatch && (
              <div className="flex items-center gap-2 text-sm text-success-foreground">
                <Check className="w-4 h-4" />
                PINs match
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!pinsMatch || setUserPin.isPending}
            >
              {setUserPin.isPending ? 'Saving...' : 'Save PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
