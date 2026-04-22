import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useConnectEntitlement } from '@/hooks/connect/useConnectEntitlement';
import type { OrganizationUser } from '@/hooks/useOrganizationUsers';

interface Props {
  member: OrganizationUser;
  profile: any;
}

function roleLabel(role: string) {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function TeamMemberHeader({ member, profile }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { isEntitled: connectEnabled } = useConnectEntitlement();

  const name = member.display_name || member.full_name || 'Unnamed';
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const primaryRole = member.roles?.[0];
  const hireDate = profile?.hire_date ? format(new Date(profile.hire_date), 'MMM yyyy') : null;
  const jobTitle = profile?.job_title;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
      <Avatar className="h-16 w-16 shrink-0">
        <AvatarImage src={member.photo_url ?? undefined} alt={name} />
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display text-xl tracking-wide text-foreground">{name.toUpperCase()}</h2>
          {!member.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
          {member.is_super_admin && <Badge variant="outline" className="text-[10px]">Super Admin</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {jobTitle && (
            <span className="font-sans text-sm text-foreground">{jobTitle}</span>
          )}
          {primaryRole && !jobTitle && (
            <span className="font-sans text-sm text-foreground">{roleLabel(primaryRole)}</span>
          )}
          {member.email && (
            <span className="font-sans text-xs text-muted-foreground flex items-center gap-1">
              {member.email}
            </span>
          )}
          {hireDate && (
            <span className="font-sans text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Hired {hireDate}
            </span>
          )}
        </div>
      </div>

      {connectEnabled && (
        <Button
          variant="outline"
          size={tokens.button.card as any}
          onClick={() => navigate(dashPath('/team-chat'))}
          className="gap-1.5 shrink-0"
        >
          <MessageCircle className="h-4 w-4" /> Message
        </Button>
      )}
    </div>
  );
}
