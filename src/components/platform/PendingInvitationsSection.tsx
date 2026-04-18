import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  usePendingInvitations, 
  useCancelPlatformInvitation, 
  useResendPlatformInvitation 
} from '@/hooks/usePlatformInvitations';
import { type PlatformRole } from '@/hooks/usePlatformRoles';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { toast } from '@/components/ui/use-toast';
import { Mail, RefreshCw, X, Loader2, Shield, Headphones, Code, Clock } from 'lucide-react';
import { LuxeLoader } from '@/components/ui/loaders';
import { PlatformButton } from './ui/PlatformButton';
import { PlatformBadge } from './ui/PlatformBadge';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from './ui/PlatformCard';

const roleConfig: Record<PlatformRole, { label: string; icon: React.ElementType; variant: 'warning' | 'info' | 'success' | 'primary' }> = {
  platform_owner: { label: 'Owner', icon: Shield, variant: 'warning' },
  platform_admin: { label: 'Admin', icon: Shield, variant: 'info' },
  platform_support: { label: 'Support', icon: Headphones, variant: 'success' },
  platform_developer: { label: 'Developer', icon: Code, variant: 'primary' },
};

export function PendingInvitationsSection() {
  const { formatDate } = useFormatDate();
  const { data: invitations, isLoading } = usePendingInvitations();
  const cancelMutation = useCancelPlatformInvitation();
  const resendMutation = useResendPlatformInvitation();

  const handleCancel = async (id: string, email: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast({
        title: 'Invitation cancelled',
        description: `The invitation to ${email} has been cancelled.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation.',
        variant: 'destructive',
      });
    }
  };

  const handleResend = async (id: string, email: string) => {
    try {
      await resendMutation.mutateAsync(id);
      toast({
        title: 'Invitation resent',
        description: `A new invitation email has been sent to ${email}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <PlatformCard variant="glass">
        <PlatformCardContent className="flex items-center justify-center py-8">
          <LuxeLoader size="lg" />
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-violet-400" />
          <PlatformCardTitle>Pending Invitations</PlatformCardTitle>
        </div>
        <PlatformCardDescription>
          {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''} awaiting response
        </PlatformCardDescription>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="rounded-xl overflow-hidden border border-slate-700/50">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="text-slate-400">Email</TableHead>
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400">Invited</TableHead>
                <TableHead className="text-slate-400">Expires</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const config = roleConfig[invitation.role];
                const Icon = config.icon;
                const expiresAt = new Date(invitation.expires_at);
                const isExpiringSoon = expiresAt.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

                return (
                  <TableRow key={invitation.id} className="border-slate-700/50 hover:bg-slate-800/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-white">{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlatformBadge variant={config.variant} className="gap-1">
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </PlatformBadge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-sm ${isExpiringSoon ? 'text-amber-400' : 'text-slate-500'}`}>
                        {isExpiringSoon && <Clock className="w-3.5 h-3.5" />}
                        {formatDate(expiresAt, 'MMM d')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PlatformButton
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleResend(invitation.id, invitation.email)}
                          disabled={resendMutation.isPending}
                          title="Resend invitation"
                        >
                          {resendMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </PlatformButton>
                        <PlatformButton
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleCancel(invitation.id, invitation.email)}
                          disabled={cancelMutation.isPending}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Cancel invitation"
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </PlatformButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
