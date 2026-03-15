import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOrgFeatureFlag, useDeleteOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import { toast } from 'sonner';

interface OrgWithBackroom {
  id: string;
  name: string;
  backroom_enabled: boolean;
  override_id: string | null;
}

export function BackroomEntitlementsTab() {
  const [search, setSearch] = useState('');

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['platform-backroom-entitlements'],
    queryFn: async (): Promise<OrgWithBackroom[]> => {
      // Fetch all orgs
      const { data: organizations, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (orgErr) throw orgErr;

      // Fetch backroom_enabled overrides
      const { data: flags, error: flagErr } = await supabase
        .from('organization_feature_flags')
        .select('*')
        .eq('flag_key', 'backroom_enabled');

      if (flagErr) throw flagErr;

      const flagMap = new Map(
        (flags || []).map((f: any) => [f.organization_id, f])
      );

      return (organizations || []).map((org: any) => {
        const flag = flagMap.get(org.id) as any;
        return {
          id: org.id,
          name: org.name,
          backroom_enabled: flag ? flag.is_enabled : false,
          override_id: flag?.id || null,
        };
      });
    },
  });

  const updateFlag = useUpdateOrgFeatureFlag();
  const deleteFlag = useDeleteOrgFeatureFlag();

  const toggleBackroom = (org: OrgWithBackroom) => {
    if (org.backroom_enabled && org.override_id) {
      // Disable — delete the override (reverts to global default which is off)
      deleteFlag.mutate(
        { organizationId: org.id, flagKey: 'backroom_enabled' },
        {
          onSuccess: () => toast.success(`Backroom disabled for ${org.name}`),
        }
      );
    } else {
      // Enable — create/update override
      updateFlag.mutate(
        {
          organizationId: org.id,
          flagKey: 'backroom_enabled',
          isEnabled: true,
          reason: 'Enabled via Platform Backroom Admin',
        },
        {
          onSuccess: () => toast.success(`Backroom enabled for ${org.name}`),
        }
      );
    }
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = orgs.filter((o) => o.backroom_enabled).length;

  return (
    <Card className="rounded-xl border-border/60 bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Backroom Entitlements</CardTitle>
            <CardDescription className="font-sans text-sm">
              {enabledCount} of {orgs.length} organizations with Backroom enabled
            </CardDescription>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 font-sans text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn(tokens.empty.container, 'py-16')}>
            <Building2 className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No organizations found</h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={tokens.table.columnHeader}>Organization</TableHead>
                <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                <TableHead className={cn(tokens.table.columnHeader, 'text-right pr-4')}>Backroom Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-sans text-sm font-medium">{org.name}</TableCell>
                  <TableCell>
                    {org.backroom_enabled ? (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-sans text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground font-sans text-xs">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Switch
                      checked={org.backroom_enabled}
                      onCheckedChange={() => toggleBackroom(org)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
