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
import { useCreateInvitation } from '@/hooks/useStaffInvitations';
import { useRoleUtils } from '@/hooks/useRoleUtils';
import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { UserPlus, Loader2, Mail, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { FormSuccess } from '@/components/ui/form-success';
import { useNotificationSound } from '@/hooks/useNotificationSound';

type AppRole = Database['public']['Enums']['app_role'];

const emailSchema = z.string().email('Please enter a valid email address');

export function InviteStaffDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('stylist');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [didSucceed, setDidSucceed] = useState(false);
  
  const createInvitation = useCreateInvitation();
  const { roleOptions } = useRoleUtils();
  const capacity = useBusinessCapacity();
  const { playSuccess, playError } = useNotificationSound();
  
  const canInvite = capacity.canAddUser || capacity.isLoading || capacity.users.isUnlimited;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.errors[0].message);
      return;
    }

    createInvitation.mutate(
      { email, role },
      {
        onSuccess: () => {
          playSuccess();
          setDidSucceed(true);
        },
        onError: () => {
          playError();
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEmail('');
          setRole('stylist');
          setEmailError(null);
          setDidSucceed(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button 
          className="gap-2" 
          disabled={!canInvite}
          title={!canInvite ? 'User seats at capacity - add more seats to invite staff' : undefined}
        >
          <UserPlus className="h-4 w-4" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New Staff Member
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

        {didSucceed ? (
          <FormSuccess
            title="Invitation sent"
            description="The invite is queued for delivery. They can create their account from the link in email."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setDidSucceed(false)}>
                  Invite another
                </Button>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </div>
            }
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
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
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createInvitation.isPending}>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
