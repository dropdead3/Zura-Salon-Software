import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Ban, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BanClientToggleProps {
  clientId: string;
  clientName: string;
  isBanned: boolean;
  banReason?: string | null;
  onBanStatusChange?: () => void;
}

export function BanClientToggle({
  clientId,
  clientName,
  isBanned,
  banReason,
  onBanStatusChange,
}: BanClientToggleProps) {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [reason, setReason] = useState('');

  // Only allow admin, manager, super_admin to ban/unban
  const canManageBan = roles.some(role => 
    ['admin', 'manager', 'super_admin'].includes(role)
  );

  const banMutation = useMutation({
    mutationFn: async (banReason: string) => {
      const updatePayload = {
        is_banned: true,
        ban_reason: banReason || null,
        banned_at: new Date().toISOString(),
        banned_by: user?.id,
      };
      // Try clients table first (native), then phorest_clients as fallback
      const { error: nativeError } = await supabase
        .from('clients')
        .update(updatePayload as any)
        .eq('id', clientId);
      
      if (nativeError) {
        const { error } = await supabase
          .from('phorest_clients')
          .update(updatePayload)
          .eq('id', clientId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-directory'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
      toast.success(`${clientName} has been banned`);
      setShowBanDialog(false);
      setReason('');
      onBanStatusChange?.();
    },
    onError: (error: Error) => {
      toast.error('Failed to ban client', { description: error.message });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
        })
        .eq('id', clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-directory'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
      toast.success(`${clientName} has been unbanned`);
      setShowUnbanDialog(false);
      onBanStatusChange?.();
    },
    onError: (error: Error) => {
      toast.error('Failed to unban client', { description: error.message });
    },
  });

  if (!canManageBan) return null;

  return (
    <>
      {isBanned ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUnbanDialog(true)}
          className="gap-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/50"
        >
          <ShieldCheck className="w-4 h-4" />
          Remove Ban
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBanDialog(true)}
          className="gap-2 text-red-500 bg-red-950/50 border border-red-900/50 hover:bg-red-900/60 hover:text-red-400 rounded-xl"
        >
          <Ban className="w-4 h-4" />
          Ban Client
        </Button>
      )}

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban <strong>{clientName}</strong>? They will be flagged across all booking systems.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Input
              id="ban-reason"
              placeholder="e.g., Repeated no-shows, inappropriate behavior..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => banMutation.mutate(reason)}
              disabled={banMutation.isPending}
            >
              {banMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Dialog */}
      <Dialog open={showUnbanDialog} onOpenChange={setShowUnbanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Ban</DialogTitle>
            <DialogDescription>
              Are you sure you want to unban <strong>{clientName}</strong>? They will be able to book appointments again.
              {banReason && (
                <span className="block mt-2 p-2 bg-muted rounded text-sm">
                  Current ban reason: {banReason}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnbanDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => unbanMutation.mutate()}
              disabled={unbanMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {unbanMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
