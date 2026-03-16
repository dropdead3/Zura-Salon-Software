import { useState } from 'react';
import { useAddPlatformRole, type PlatformRole } from '@/hooks/usePlatformRoles';
import { useCreatePlatformInvitation } from '@/hooks/usePlatformInvitations';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Shield, Headphones, Code, Mail, UserCheck } from 'lucide-react';
import { PlatformButton } from './ui/PlatformButton';
import { PlatformInput } from './ui/PlatformInput';
import { PlatformLabel } from './ui/PlatformLabel';

interface InvitePlatformUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions: { value: PlatformRole; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'platform_admin', label: 'Platform Admin', description: 'Full platform access, user management', icon: Shield },
  { value: 'platform_support', label: 'Platform Support', description: 'View all orgs, perform migrations', icon: Headphones },
  { value: 'platform_developer', label: 'Platform Developer', description: 'View access, testing, debugging', icon: Code },
];

type FlowState = 'input' | 'existing_user' | 'new_user';

interface UserCheck {
  userId: string;
  fullName: string | null;
  email: string;
}

export function InvitePlatformUserDialog({ open, onOpenChange }: InvitePlatformUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformRole>('platform_support');
  const [loading, setLoading] = useState(false);
  const [flowState, setFlowState] = useState<FlowState>('input');
  const [existingUser, setExistingUser] = useState<UserCheck | null>(null);
  
  const addRoleMutation = useAddPlatformRole();
  const createInvitationMutation = useCreatePlatformInvitation();

  const resetDialog = () => {
    setEmail('');
    setRole('platform_support');
    setFlowState('input');
    setExistingUser(null);
    setLoading(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  };

  const checkUserExists = async () => {
    setLoading(true);

    try {
      // Check for existing user
      const { data: profiles, error: profileError } = await supabase
        .from('employee_profiles')
        .select('user_id, email, full_name')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (profileError) {
        throw new Error('Failed to search for user');
      }

      if (profiles && profiles.length > 0) {
        // User exists - check if they already have this role
        const { data: existingRoles } = await supabase
          .from('platform_roles')
          .select('role')
          .eq('user_id', profiles[0].user_id)
          .eq('role', role);

        if (existingRoles && existingRoles.length > 0) {
          toast({
            title: 'Already assigned',
            description: 'This user already has the selected platform role.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        setExistingUser({
          userId: profiles[0].user_id,
          fullName: profiles[0].full_name,
          email: profiles[0].email || email,
        });
        setFlowState('existing_user');
      } else {
        // Check for pending invitation
        const { data: pendingInvites } = await supabase
          .from('platform_invitations')
          .select('id')
          .eq('email', email.toLowerCase())
          .eq('status', 'pending');

        if (pendingInvites && pendingInvites.length > 0) {
          toast({
            title: 'Invitation pending',
            description: 'An invitation has already been sent to this email address.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        setFlowState('new_user');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!existingUser) return;
    setLoading(true);

    try {
      await addRoleMutation.mutateAsync({ userId: existingUser.userId, role });

      toast({
        title: 'Team member added',
        description: `${existingUser.fullName || email} has been granted ${role.replace('platform_', '')} access.`,
      });

      handleClose(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add team member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    setLoading(true);

    try {
      await createInvitationMutation.mutateAsync({ email, role });

      toast({
        title: 'Invitation sent',
        description: `An invitation email has been sent to ${email}.`,
      });

      handleClose(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (flowState === 'input') {
      await checkUserExists();
    } else if (flowState === 'existing_user') {
      await handleAssignRole();
    } else if (flowState === 'new_user') {
      await handleSendInvitation();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {flowState === 'input' && 'Add Platform Team Member'}
            {flowState === 'existing_user' && 'Assign Platform Role'}
            {flowState === 'new_user' && 'Send Invitation'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {flowState === 'input' && 'Enter an email address to add a new team member or invite someone new.'}
            {flowState === 'existing_user' && `${existingUser?.fullName || existingUser?.email} already has an account.`}
            {flowState === 'new_user' && `No account found for ${email}. Send an invitation to create one.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {flowState === 'input' && (
            <>
              <div className="space-y-2">
                <PlatformLabel htmlFor="email">Email Address</PlatformLabel>
                <PlatformInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="team@company.com"
                  required
                  autoCapitalize="none"
                />
              </div>

              <div className="space-y-2">
                <PlatformLabel htmlFor="role">Platform Role</PlatformLabel>
                <Select value={role} onValueChange={(v) => setRole(v as PlatformRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem 
                          key={opt.value} 
                          value={opt.value}
                          className="text-slate-300 focus:bg-slate-700 focus:text-white"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-violet-400" />
                            <div>
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-slate-500 text-xs ml-2">
                                {opt.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {flowState === 'existing_user' && (
            <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {existingUser?.fullName || 'Unknown'}
                </p>
                <p className="text-xs text-slate-400">{existingUser?.email}</p>
              </div>
            </div>
          )}

          {flowState === 'new_user' && (
            <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Mail className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Invitation Email</p>
                <p className="text-xs text-slate-400">
                  They'll receive a link to create an account with {role.replace('platform_', '')} access.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {flowState !== 'input' && (
              <PlatformButton 
                type="button" 
                variant="secondary" 
                onClick={() => setFlowState('input')}
              >
                Back
              </PlatformButton>
            )}
            <PlatformButton 
              type="button" 
              variant="secondary" 
              onClick={() => handleClose(false)}
            >
              Cancel
            </PlatformButton>
            <PlatformButton type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {flowState === 'input' && 'Continue'}
              {flowState === 'existing_user' && 'Assign Role'}
              {flowState === 'new_user' && 'Send Invitation'}
            </PlatformButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
