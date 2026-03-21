import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreateInvitation, usePendingInvitations } from '@/hooks/useStaffInvitations';
import { useInvitableRoles, LEADERSHIP_ROLES } from '@/hooks/useInvitableRoles';
import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { 
  UserPlus, 
  Loader2, 
  Mail, 
  AlertCircle, 
  ChevronRight,
  Info,
  Crown,
} from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const emailSchema = z.string().email('Please enter a valid email address');

interface ManagementInviteDialogProps {
  /** Custom trigger element. If not provided, uses default card trigger */
  trigger?: React.ReactNode;
  /** Whether to show as a card (for Management Hub) or just a button */
  variant?: 'card' | 'button';
}

export function ManagementInviteDialog({ trigger, variant = 'card' }: ManagementInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const createInvitation = useCreateInvitation();
  const { roleOptions, canInvite, canInviteLeadership, isLoading: rolesLoading } = useInvitableRoles();
  const capacity = useBusinessCapacity();
  const { data: pendingInvitations } = usePendingInvitations();

  const pendingCount = pendingInvitations?.length || 0;
  const canInviteMore = capacity.canAddUser || capacity.isLoading || capacity.users.isUnlimited;
  const isDisabled = !canInvite || !canInviteMore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!role) {
      return;
    }

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.errors[0].message);
      return;
    }

    createInvitation.mutate(
      { email, role },
      {
        onSuccess: () => {
          setOpen(false);
          setEmail('');
          setRole('');
        },
      }
    );
  };

  const selectedRoleIsLeadership = role && LEADERSHIP_ROLES.includes(role as AppRole);

  // Default card trigger for Management Hub
  const defaultTrigger = variant === 'card' ? (
    <Card 
      className={cn(
        "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50",
        isDisabled && "opacity-60 cursor-not-allowed hover:shadow-none hover:translate-y-0"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-xl shrink-0 bg-green-500/10 text-green-600 dark:text-green-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">Invite Team Member</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                Send invitations to new staff members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Button 
      className="gap-2" 
      disabled={isDisabled}
      title={!canInvite ? 'You do not have permission to invite team members' : 
             !canInviteMore ? 'User seats at capacity' : undefined}
    >
      <UserPlus className="h-4 w-4" />
      Invite Staff
    </Button>
  );

  if (!canInvite) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={isDisabled}>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to a new team member. They'll be able to create their account using this invitation.
          </DialogDescription>
        </DialogHeader>

        {/* Capacity warning */}
        {!capacity.canAddUser && !capacity.users.isUnlimited && !capacity.isLoading && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your user seat limit ({capacity.users.used}/{capacity.users.total}).
              Contact your organization admin to add more seats before inviting new staff.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.isLeadership && (
                        <Crown className="h-3 w-3 text-amber-500" />
                      )}
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Leadership role notice */}
            {selectedRoleIsLeadership && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                <Crown className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Leadership roles have elevated permissions including access to sensitive data and management features.
                </span>
              </div>
            )}

            {/* Info for non-super admins */}
            {!canInviteLeadership && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted text-muted-foreground text-xs">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Only Super Admins can invite Admin and Manager roles.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createInvitation.isPending || !role || rolesLoading}
            >
              {createInvitation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
