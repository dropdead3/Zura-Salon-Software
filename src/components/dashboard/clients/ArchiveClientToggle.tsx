import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ArchiveClientToggleProps {
  clientId: string;
  clientName: string;
  isArchived: boolean;
  onArchiveStatusChange?: () => void;
}

export function ArchiveClientToggle({
  clientId,
  clientName,
  isArchived,
  onArchiveStatusChange,
}: ArchiveClientToggleProps) {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  // Only super_admin can archive/restore
  const canArchive = roles.includes('super_admin');

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          is_archived: !isArchived,
          archived_at: !isArchived ? new Date().toISOString() : null,
          archived_by: !isArchived ? user?.id : null,
        } as any)
        .eq('id', clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-directory'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
      toast.success(isArchived ? `${clientName} has been restored` : `${clientName} has been archived`);
      setShowDialog(false);
      onArchiveStatusChange?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isArchived ? 'restore' : 'archive'} client`, { description: error.message });
    },
  });

  if (!canArchive) return null;

  return (
    <>
      {isArchived ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
        >
          <ArchiveRestore className="w-4 h-4" />
          Restore
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Archive className="w-4 h-4" />
          Archive
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArchived ? 'Restore Client' : 'Archive Client'}</DialogTitle>
            <DialogDescription>
              {isArchived
                ? `Are you sure you want to restore ${clientName}? They will reappear in the client directory and marketing will resume.`
                : `Archiving ${clientName} will stop all marketing and hide them from default views. They can be restored later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={isArchived ? 'default' : 'destructive'}
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isArchived ? 'Restore Client' : 'Archive Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
