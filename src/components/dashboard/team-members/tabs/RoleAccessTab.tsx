import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, ExternalLink, Trash2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useUpdateOrganizationUserRole, type OrganizationUser } from '@/hooks/useOrganizationUsers';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Props {
  userId: string;
  member: OrganizationUser;
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'super_admin' as AppRole, label: 'Super Admin' },
  { value: 'admin' as AppRole, label: 'Admin' },
  { value: 'manager' as AppRole, label: 'Manager' },
  { value: 'general_manager' as AppRole, label: 'General Manager' },
  { value: 'assistant_manager' as AppRole, label: 'Assistant Manager' },
  { value: 'director_of_operations' as AppRole, label: 'Director of Operations' },
  { value: 'operations_assistant' as AppRole, label: 'Operations Assistant' },
  { value: 'receptionist' as AppRole, label: 'Receptionist' },
  { value: 'front_desk' as AppRole, label: 'Front Desk' },
  { value: 'stylist' as AppRole, label: 'Stylist' },
  { value: 'stylist_assistant' as AppRole, label: 'Stylist Assistant' },
];

function roleLabel(role: string) {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function RoleAccessTab({ userId, member }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const updateRole = useUpdateOrganizationUserRole(effectiveOrganization?.id);

  const handleAddRole = (role: AppRole) => {
    if (!member.roles.includes(role)) {
      updateRole.mutate({ userId, role, action: 'add' });
    }
  };

  const handleRemoveRole = (role: AppRole) => {
    updateRole.mutate({ userId, role, action: 'remove' });
  };

  const availableToAdd = ROLE_OPTIONS.filter(r => !member.roles.includes(r.value));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">ROLES</CardTitle>
          </div>
          <CardDescription>Roles control what this team member can see and do across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-sans text-sm font-medium text-foreground mb-2">Active roles</p>
            {member.roles.length === 0 ? (
              <p className={tokens.body.muted + ' text-sm'}>No roles assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {member.roles.map(r => (
                  <Badge key={r} variant="secondary" className="gap-1.5 pr-1">
                    {roleLabel(r)}
                    <button
                      onClick={() => handleRemoveRole(r)}
                      disabled={updateRole.isPending}
                      className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                      aria-label={`Remove ${r}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-sans text-sm font-medium text-foreground mb-2">Add a role</p>
            <div className="flex items-center gap-2 max-w-sm">
              <Select onValueChange={(v) => handleAddRole(v as AppRole)} disabled={updateRole.isPending || availableToAdd.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={availableToAdd.length === 0 ? 'All roles assigned' : 'Select a role to add'} />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updateRole.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-wide">GRANULAR PERMISSIONS</CardTitle>
          <CardDescription>Configure module visibility and feature gates per role in the Roles &amp; Controls Hub.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate(dashPath('/admin/access-hub'))} className="gap-1.5">
            <ExternalLink className="h-4 w-4" /> Open Roles &amp; Controls Hub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
