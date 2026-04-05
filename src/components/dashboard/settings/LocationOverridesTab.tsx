/**
 * LocationOverridesTab — Matrix editor for per-location/per-group
 * criteria and commission overrides within the Stylist Levels configurator.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MapPin, RotateCcw, Save, Loader2 } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useActiveLocations } from '@/hooks/useLocations';
import { useLocationGroups, type LocationGroup } from '@/hooks/useLocationGroups';
import {
  useLevelCriteriaOverrides,
  useLevelCommissionOverrides,
  useUpsertCriteriaOverride,
  useDeleteCriteriaOverride,
  useUpsertCommissionOverride,
  useDeleteCommissionOverrideById,
  resolveCriteriaValue,
  type LevelCriteriaOverride,
} from '@/hooks/useLevelCriteriaOverrides';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import type { LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';

interface StylistLevelMin {
  id: string;
  dbId?: string;
  slug: string;
  label: string;
  serviceCommissionRate: string;
  retailCommissionRate: string;
}

interface LocationOverridesTabProps {
  levels: StylistLevelMin[];
  promotionCriteria: LevelPromotionCriteria[];
  retentionCriteria: LevelRetentionCriteria[];
}

/** KPI fields that can be overridden */
const OVERRIDE_FIELDS = [
  { key: 'revenue_threshold', label: 'Revenue', unit: '$', type: 'promotion' as const },
  { key: 'retail_pct_threshold', label: 'Retail %', unit: '%', type: 'promotion' as const },
  { key: 'rebooking_pct_threshold', label: 'Rebooking %', unit: '%', type: 'promotion' as const },
  { key: 'avg_ticket_threshold', label: 'Avg Ticket', unit: '$', type: 'promotion' as const },
  { key: 'retention_rate_threshold', label: 'Retention Rate', unit: '%', type: 'promotion' as const },
  { key: 'new_clients_threshold', label: 'New Clients', unit: '/mo', type: 'promotion' as const },
  { key: 'utilization_threshold', label: 'Utilization', unit: '%', type: 'promotion' as const },
  { key: 'rev_per_hour_threshold', label: 'Rev/Hr', unit: '$', type: 'promotion' as const },
  { key: 'evaluation_window_days', label: 'Eval Window', unit: 'd', type: 'promotion' as const },
];

export function LocationOverridesTab({ levels, promotionCriteria, retentionCriteria }: LocationOverridesTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: locations = [] } = useActiveLocations();
  const { data: groups = [] } = useLocationGroups();
  const { data: criteriaOverrides = [] } = useLevelCriteriaOverrides();
  const { data: commissionOverrides = [] } = useLevelCommissionOverrides();
  const upsertCriteria = useUpsertCriteriaOverride();
  const deleteCriteria = useDeleteCriteriaOverride();
  const upsertCommission = useUpsertCommissionOverride();
  const deleteCommission = useDeleteCommissionOverrideById();

  const [selectedLevelIdx, setSelectedLevelIdx] = useState(0);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const selectedLevel = levels[selectedLevelIdx];
  const levelDbId = selectedLevel?.dbId || selectedLevel?.id;
  const promo = promotionCriteria.find(c => c.stylist_level_id === levelDbId && c.is_active);

  // Group locations by their group
  const groupedLocations = useMemo(() => {
    const grouped: { group: LocationGroup | null; locations: typeof locations }[] = [];
    const ungrouped = locations.filter(l => !groups.some(g => {
      // Check if location belongs to this group via location_group_id
      // We need to read location_group_id from location data
      return false; // We'll handle this differently
    }));

    // For now, show all locations flat (groups shown as section headers when available)
    if (groups.length > 0) {
      for (const g of groups) {
        const groupLocs = locations.filter((l: any) => l.location_group_id === g.id);
        if (groupLocs.length > 0) {
          grouped.push({ group: g, locations: groupLocs });
        }
      }
      const ungroupedLocs = locations.filter((l: any) => !l.location_group_id);
      if (ungroupedLocs.length > 0) {
        grouped.push({ group: null, locations: ungroupedLocs });
      }
    } else {
      grouped.push({ group: null, locations });
    }
    return grouped;
  }, [locations, groups]);

  if (!orgId || levels.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Create levels first to configure location overrides.
      </div>
    );
  }

  if (locations.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Location overrides require 2+ active locations.
      </div>
    );
  }

  const getOrgDefault = (field: string): number => {
    if (!promo) return 0;
    return Number((promo as any)[field]) || 0;
  };

  const getOverrideForLocation = (field: string, locationId: string) => {
    return criteriaOverrides.find(
      o => o.stylist_level_id === levelDbId
        && o.criteria_type === 'promotion'
        && o.override_field === field
        && o.location_id === locationId
    );
  };

  const handleSave = async (field: string, locationId: string) => {
    const numVal = parseFloat(editValue);
    if (isNaN(numVal)) {
      setEditingCell(null);
      return;
    }
    await upsertCriteria.mutateAsync({
      organization_id: orgId!,
      stylist_level_id: levelDbId!,
      location_id: locationId,
      criteria_type: 'promotion',
      override_field: field,
      override_value: numVal,
    });
    setEditingCell(null);
  };

  const handleReset = async (field: string, locationId: string) => {
    const override = getOverrideForLocation(field, locationId);
    if (override) {
      await deleteCriteria.mutateAsync(override.id);
    }
  };

  const cellKey = (field: string, locId: string) => `${field}:${locId}`;

  // Only show fields that are enabled in the org-level criteria
  const activeFields = OVERRIDE_FIELDS.filter(f => {
    if (!promo) return false;
    const enabledKey = f.key.replace('_threshold', '_enabled').replace('_days', '_enabled');
    // For evaluation_window_days there's no _enabled toggle
    if (f.key === 'evaluation_window_days') return true;
    return (promo as any)[enabledKey] === true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={cn(tokens.card.title, 'flex items-center gap-1.5')}>
                Location Overrides
                <MetricInfoTooltip description="Override KPI targets per location. Inherited values from org defaults are shown dimmed — click to set a location-specific value, or reset to inherit." />
              </CardTitle>
              <CardDescription className="text-xs">
                Set per-location KPI targets that differ from org defaults
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Level selector */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-muted-foreground">Level:</span>
            <Select
              value={String(selectedLevelIdx)}
              onValueChange={(v) => setSelectedLevelIdx(Number(v))}
            >
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l, i) => (
                  <SelectItem key={l.id} value={String(i)}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Matrix table */}
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2 font-sans font-medium text-muted-foreground sticky left-0 bg-muted/30 min-w-[120px]">
                    Location
                  </th>
                  {activeFields.map(f => (
                    <th key={f.key} className="text-center p-2 font-sans font-medium text-muted-foreground min-w-[90px]">
                      {f.label}
                    </th>
                  ))}
                </tr>
                {/* Org default row */}
                <tr className="border-b border-border/60 bg-muted/10">
                  <td className="p-2 font-medium text-foreground sticky left-0 bg-muted/10">
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">ORG DEFAULT</Badge>
                    </span>
                  </td>
                  {activeFields.map(f => (
                    <td key={f.key} className="text-center p-2 text-muted-foreground tabular-nums">
                      {f.unit === '$' ? `$${getOrgDefault(f.key).toLocaleString()}` : `${getOrgDefault(f.key)}${f.unit}`}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedLocations.map(({ group, locations: groupLocs }) => (
                  <>
                    {group && (
                      <tr key={`group-${group.id}`} className="bg-muted/20">
                        <td colSpan={activeFields.length + 1} className="p-1.5 px-2 text-[10px] font-display tracking-wide text-muted-foreground">
                          {group.name}
                        </td>
                      </tr>
                    )}
                    {groupLocs.map(loc => (
                      <tr key={loc.id} className="border-b border-border/30 hover:bg-muted/10">
                        <td className="p-2 text-foreground sticky left-0 bg-card">
                          {loc.name}
                        </td>
                        {activeFields.map(f => {
                          const override = getOverrideForLocation(f.key, loc.id);
                          const orgVal = getOrgDefault(f.key);
                          const displayVal = override ? override.override_value : orgVal;
                          const isEditing = editingCell === cellKey(f.key, loc.id);

                          return (
                            <td key={f.key} className="text-center p-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Input
                                    className="w-16 h-6 text-xs text-center p-0"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSave(f.key, loc.id);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="w-5 h-5"
                                    onClick={() => handleSave(f.key, loc.id)}
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  className={cn(
                                    'tabular-nums px-2 py-0.5 rounded hover:bg-accent transition-colors cursor-pointer',
                                    override ? 'text-foreground font-medium' : 'text-muted-foreground/60'
                                  )}
                                  onClick={() => {
                                    setEditingCell(cellKey(f.key, loc.id));
                                    setEditValue(String(displayVal));
                                  }}
                                  title={override ? 'Click to edit override' : 'Click to set override'}
                                >
                                  {f.unit === '$' ? `$${displayVal.toLocaleString()}` : `${displayVal}${f.unit}`}
                                  {override && (
                                    <span
                                      className="ml-1 text-muted-foreground/40 hover:text-destructive cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReset(f.key, loc.id);
                                      }}
                                      title="Reset to org default"
                                    >
                                      ×
                                    </span>
                                  )}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            Dimmed values inherit from org defaults. Click any cell to set a location-specific override. Click × to reset.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
