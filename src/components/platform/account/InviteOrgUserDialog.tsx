import { useState } from 'react';
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
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { Mail, User, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABELS } from '@/hooks/useUserRoles';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface InviteOrgUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
}

const emailSchema = z.string().email('Please enter a valid email address');

const roleOptions: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features and settings' },
  { value: 'manager', label: 'Manager', description: 'Can manage team, view reports, and approve requests' },
  { value: 'stylist', label: 'Stylist', description: 'Access to stylist features and programs' },
  { value: 'receptionist', label: 'Receptionist', description: 'Front desk and scheduling access' },
  { value: 'stylist_assistant', label: 'Stylist Assistant', description: 'Assists stylists with client services' },
  { value: 'admin_assistant', label: 'Admin Assistant', description: 'Administrative support role' },
  { value: 'operations_assistant', label: 'Operations Assistant', description: 'Supports daily operations' },
];

export function InviteOrgUserDialog({ 
  open, 
  onOpenChange, 
  organizationId, 
  organizationName 
}: InviteOrgUserDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('stylist');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      // Get current user to set as inviter
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Create an invitation for this organization
      const { error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          email: email.toLowerCase().trim(),
          role,
          invited_by: currentUser.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          throw new Error('An invitation has already been sent to this email');
        }
        throw inviteError;
      }

      toast.success(`Invitation sent to ${email}`, {
        description: `They'll receive an email to join ${organizationName}`,
      });

      queryClient.invalidateQueries({ queryKey: ['organization-users', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      
      // Reset and close
      setEmail('');
      setRole('stylist');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5 text-violet-400" />
            Invite User to {organizationName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Send an invitation email to add a new team member to this organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {roleOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-slate-300 focus:bg-slate-800 focus:text-white"
                  >
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-slate-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <PlatformButton 
              variant="secondary" 
              type="button" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </PlatformButton>
            <PlatformButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </PlatformButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
