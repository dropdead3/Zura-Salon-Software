import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { ROLE_OPTIONS } from '@/lib/handbook/brandTones';
import {
  useHandbooksByRole,
  useCreateHandbookForRole,
  useHandbookAckCounts,
} from '@/hooks/handbook/useHandbookData';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { RoleHandbookCard } from './RoleHandbookCard';
import { CustomRoleDialog } from './CustomRoleDialog';

interface Props {
  onShowAllToggle?: () => void;
  showingAll?: boolean;
}

export function RoleHandbookGrid({ onShowAllToggle, showingAll }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { byRole, allHandbooks, isLoading } = useHandbooksByRole();
  const { data: ackCounts } = useHandbookAckCounts();
  const createForRole = useCreateHandbookForRole();
  const [customOpen, setCustomOpen] = useState(false);
  const [pendingRoleKey, setPendingRoleKey] = useState<string | null>(null);

  // Custom roles already in use (handbooks with primary_role not in ROLE_OPTIONS)
  const customRoleHandbooks = useMemo(() => {
    const standard = new Set(ROLE_OPTIONS.map((r) => r.key));
    return (allHandbooks || []).filter(
      (h: any) => h.primary_role && !standard.has(h.primary_role)
    );
  }, [allHandbooks]);

  const handleConfigure = async (roleKey: string, roleLabel: string) => {
    setPendingRoleKey(roleKey);
    try {
      const result = await createForRole.mutateAsync({ primaryRole: roleKey, roleLabel });
      navigate(dashPath(`/admin/handbook-wizard/${result.handbook.id}/edit`));
    } finally {
      setPendingRoleKey(null);
    }
  };

  const handleOpen = (handbook: any) => {
    navigate(dashPath(`/admin/handbook-wizard/${handbook.id}/edit`));
  };

  const handleUpload = (roleKey: string) => {
    navigate(dashPath(`/admin/handbooks?tab=documents&upload=role&role=${roleKey}`));
  };

  const handleCustomConfirm = async (roleKey: string, roleLabel: string) => {
    setCustomOpen(false);
    await handleConfigure(roleKey, roleLabel);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="rounded-xl border-border bg-card/80">
            <CardContent className="p-5 h-48 animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ROLE_OPTIONS.map((role) => (
          <RoleHandbookCard
            key={role.key}
            roleKey={role.key}
            roleLabel={role.label}
            handbook={byRole.get(role.key)}
            ackCount={ackCounts?.get(byRole.get(role.key)?.id)}
            loading={pendingRoleKey === role.key}
            onConfigure={() => handleConfigure(role.key, role.label)}
            onUpload={() => handleUpload(role.key)}
            onOpen={() => byRole.get(role.key) && handleOpen(byRole.get(role.key))}
          />
        ))}

        {/* Custom roles */}
        {customRoleHandbooks.map((h: any) => (
          <RoleHandbookCard
            key={h.id}
            roleKey={h.primary_role}
            roleLabel={h.name.replace(/ Handbook$/, '')}
            handbook={h}
            ackCount={ackCounts?.get(h.id)}
            onConfigure={() => handleOpen(h)}
            onUpload={() => handleUpload(h.primary_role)}
            onOpen={() => handleOpen(h)}
          />
        ))}

        {/* Add custom role tile */}
        <button
          onClick={() => setCustomOpen(true)}
          className={cn(
            'rounded-xl border border-dashed border-border bg-card/40',
            'hover:border-primary/40 hover:bg-card/60 transition-colors',
            'flex flex-col items-center justify-center gap-2 p-8 min-h-[12rem]',
            'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-display text-xs tracking-wider uppercase">Custom role</span>
          <span className="font-sans text-xs text-muted-foreground text-center max-w-[14rem]">
            Add a handbook for a non-standard title
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <p className="font-sans text-xs text-muted-foreground">
          {ROLE_OPTIONS.length + customRoleHandbooks.length} role{(ROLE_OPTIONS.length + customRoleHandbooks.length) === 1 ? '' : 's'} ·{' '}
          {Array.from(byRole.values()).length + customRoleHandbooks.length} handbook
          {Array.from(byRole.values()).length + customRoleHandbooks.length === 1 ? '' : 's'} configured
        </p>
        {onShowAllToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowAllToggle}
            className="font-sans text-xs"
          >
            {showingAll ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1" /> Hide flat list
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 mr-1" /> View all handbooks
              </>
            )}
          </Button>
        )}
      </div>

      <CustomRoleDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        onConfirm={handleCustomConfirm}
        pending={createForRole.isPending}
      />
    </div>
  );
}
