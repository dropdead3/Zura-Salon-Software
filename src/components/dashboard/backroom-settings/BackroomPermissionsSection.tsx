import { useState, useMemo } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomSetting, useUpsertBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Save } from 'lucide-react';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

const PERMISSION_TOOLTIPS: Record<string, string> = {
  view_backroom: 'Access to the Backroom mixing dashboard.',
  mix_bowls: 'Ability to create and manage mixing bowls.',
  smart_mix_assist: 'Access to AI-powered formula suggestions during mixing.',
  formula_memory: 'View and recall past formulas for returning clients.',
  assistant_prep: 'Pre-mix bowls before the stylist arrives.',
  approve_assistant: 'Approve or reject assistant-prepared bowls.',
  view_costs: 'See product cost data and margin information.',
  view_charges: 'See overage charges applied to services.',
  override_charges: 'Modify or override overage charges after calculation.',
  waive_overage: 'Waive overage charges entirely for a service.',
  edit_inventory: 'Modify inventory counts and par levels.',
  perform_counts: 'Conduct physical inventory counts.',
  receive_po: 'Mark purchase orders as received and update stock.',
  resolve_exceptions: 'Review and resolve operational exception reports.',
  configure_settings: 'Access and modify Backroom configuration settings.',
};

const ROLES = [
  { key: 'owner', label: 'Owner' },
  { key: 'manager', label: 'Manager' },
  { key: 'inventory_manager', label: 'Inventory Mgr' },
  { key: 'front_desk', label: 'Front Desk' },
  { key: 'stylist', label: 'Stylist' },
  { key: 'assistant', label: 'Assistant' },
  { key: 'independent_stylist', label: 'Independent' },
  { key: 'booth_renter', label: 'Booth Renter' },
] as const;

const PERMISSIONS = [
  { key: 'view_backroom', label: 'View Backroom', group: 'Access' },
  { key: 'mix_bowls', label: 'Mix Bowls', group: 'Mixing' },
  { key: 'smart_mix_assist', label: 'Smart Mix Assist', group: 'Mixing' },
  { key: 'formula_memory', label: 'Formula Memory', group: 'Mixing' },
  { key: 'assistant_prep', label: 'Assistant Prep', group: 'Mixing' },
  { key: 'approve_assistant', label: 'Approve Assistant', group: 'Mixing' },
  { key: 'view_costs', label: 'View Costs', group: 'Financial' },
  { key: 'view_charges', label: 'View Charges', group: 'Financial' },
  { key: 'override_charges', label: 'Override Charges', group: 'Financial' },
  { key: 'waive_overage', label: 'Waive Overage', group: 'Financial' },
  { key: 'edit_inventory', label: 'Edit Inventory', group: 'Inventory' },
  { key: 'perform_counts', label: 'Perform Counts', group: 'Inventory' },
  { key: 'receive_po', label: 'Receive PO', group: 'Inventory' },
  { key: 'resolve_exceptions', label: 'Resolve Exceptions', group: 'Operations' },
  { key: 'configure_settings', label: 'Configure Settings', group: 'Operations' },
] as const;

// Default permissions: owners get everything, managers get most
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSIONS.map(p => p.key),
  manager: PERMISSIONS.filter(p => p.key !== 'configure_settings').map(p => p.key),
  inventory_manager: ['view_backroom', 'view_costs', 'edit_inventory', 'perform_counts', 'receive_po', 'resolve_exceptions'],
  front_desk: ['view_backroom', 'view_charges'],
  stylist: ['view_backroom', 'mix_bowls', 'smart_mix_assist', 'formula_memory'],
  assistant: ['view_backroom', 'mix_bowls', 'assistant_prep'],
  independent_stylist: ['view_backroom', 'mix_bowls', 'smart_mix_assist', 'formula_memory'],
  booth_renter: ['view_backroom', 'mix_bowls'],
};

export function BackroomPermissionsSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: setting, isLoading } = useBackroomSetting('backroom_permissions');
  const upsert = useUpsertBackroomSetting();

  const savedPerms = (setting?.value || {}) as Record<string, string[]>;
  const [perms, setPerms] = useState<Record<string, string[]> | null>(null);

  // Initialize from saved or defaults
  const matrix = useMemo(() => {
    if (perms) return perms;
    const merged: Record<string, string[]> = {};
    for (const role of ROLES) {
      merged[role.key] = savedPerms[role.key] || DEFAULT_PERMISSIONS[role.key] || [];
    }
    return merged;
  }, [perms, savedPerms]);

  const toggle = (role: string, permission: string) => {
    const current = matrix[role] || [];
    const next = current.includes(permission)
      ? current.filter(p => p !== permission)
      : [...current, permission];
    setPerms({ ...matrix, [role]: next });
  };

  const handleSave = () => {
    if (!orgId) return;
    upsert.mutate({
      organization_id: orgId,
      setting_key: 'backroom_permissions',
      setting_value: matrix as Record<string, unknown>,
    }, { onSuccess: () => setPerms(null) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  const groups = [...new Set(PERMISSIONS.map(p => p.group))];

  return (
    <div className="space-y-6">
      <Infotainer
        id="backroom-permissions-guide"
        title="Backroom Permissions"
        description="Decide who can do what in Backroom — from mixing bowls to viewing costs to overriding charges. Each column is a role, each row is a capability."
        icon={<Shield className="h-4 w-4 text-primary" />}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Shield className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Backroom Permissions</CardTitle>
              <CardDescription className={tokens.body.muted}>Control which roles can access backroom features.</CardDescription>
            </div>
          </div>
          <Button size={tokens.button.card} className={tokens.button.cardAction} onClick={handleSave} disabled={!perms || upsert.isPending}>
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={cn(tokens.table.columnHeader, 'text-left py-2 pr-4 w-40')}>Permission</th>
                  {ROLES.map(r => (
                    <th key={r.key} className={cn(tokens.table.columnHeader, 'text-center py-2 px-2 min-w-[80px]')}>{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <>
                    <tr key={`group-${group}`}>
                      <td colSpan={ROLES.length + 1} className="pt-4 pb-1">
                        <span className={tokens.heading.subsection}>{group}</span>
                      </td>
                    </tr>
                    {PERMISSIONS.filter(p => p.group === group).map(perm => (
                      <tr key={perm.key} className="border-b border-border/30">
                        <td className={cn(tokens.body.default, 'py-2.5 pr-4')}>
                          <span className="flex items-center gap-1">
                            {perm.label}
                            {PERMISSION_TOOLTIPS[perm.key] && <MetricInfoTooltip description={PERMISSION_TOOLTIPS[perm.key]} />}
                          </span>
                        </td>
                        {ROLES.map(role => (
                          <td key={role.key} className="text-center py-2.5">
                            <Checkbox
                              checked={(matrix[role.key] || []).includes(perm.key)}
                              onCheckedChange={() => toggle(role.key, perm.key)}
                              disabled={role.key === 'owner'}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn(tokens.body.muted, 'mt-4')}>
            Owner permissions cannot be modified. Changes apply to all backroom features across locations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
