import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Eye, Settings2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useCanCustomizeDashboardLayouts } from '@/hooks/useDashboardLayout';
import { useTeamDashboardSummary, type RoleSummary } from '@/hooks/useTeamDashboardSummary';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

/**
 * Owner-facing governance card. Promotes role-keyed dashboard layout
 * customization out of the buried Customize menu so the underlying
 * Phase 1+2 governance work is discoverable on first paint.
 *
 * Owner-only: returns null for non-primary-owners (matches RLS posture).
 */
export function TeamDashboardsCard() {
  const canCustomize = useCanCustomizeDashboardLayouts();
  const { data: summary = [], isLoading } = useTeamDashboardSummary();
  const { setViewAsRole, viewAsRole, isViewingAs } = useViewAs();

  if (!canCustomize) return null;

  return (
    <Card className="relative overflow-hidden p-6 rounded-xl bg-card/80 backdrop-blur-xl border-border">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base tracking-wide">Team Dashboards</h2>
            <p className="text-sm text-muted-foreground font-sans mt-0.5">
              Curate what each role sees when they log in.
            </p>
          </div>
        </div>
        {isViewingAs && (
          <Badge variant="outline" className="gap-1.5 font-sans">
            <Sparkles className="w-3 h-3" />
            Previewing as {viewAsRole?.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-muted/40 animate-pulse"
              />
            ))
          : summary.map((row) => (
              <RoleTile
                key={row.role}
                row={row}
                isActive={isViewingAs && viewAsRole === row.role}
                onPreview={() => setViewAsRole(row.role)}
              />
            ))}
      </div>

      {isViewingAs && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-sm font-sans text-foreground">
            You're previewing the dashboard as{' '}
            <span className="font-medium">{viewAsRole?.replace(/_/g, ' ')}</span>. Open
            Customize Dashboard to edit this layout.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewAsRole(null)}
            className="font-sans"
          >
            Exit preview
          </Button>
        </div>
      )}
    </Card>
  );
}

interface RoleTileProps {
  row: RoleSummary;
  isActive: boolean;
  onPreview: () => void;
}

function RoleTile({ row, isActive, onPreview }: RoleTileProps) {
  const lastEditedLabel = useMemo(() => {
    if (!row.lastEditedAt) return null;
    try {
      return `Edited ${formatDistanceToNow(new Date(row.lastEditedAt), { addSuffix: true })}`;
    } catch {
      return null;
    }
  }, [row.lastEditedAt]);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-2 transition-colors',
        isActive
          ? 'border-primary/60 bg-primary/5'
          : 'border-border/50 bg-muted/30 hover:bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-xs tracking-wider uppercase">{row.label}</p>
        {row.hasOverride ? (
          <Badge variant="default" className="text-[10px] font-sans h-5 px-1.5">
            Custom
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] font-sans h-5 px-1.5 text-muted-foreground">
            Default
          </Badge>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground font-sans min-h-[14px]">
        {lastEditedLabel ?? (row.hasOverride ? 'Custom layout' : 'Using template')}
      </p>

      <Button
        size="sm"
        variant="outline"
        onClick={onPreview}
        disabled={isActive}
        className="mt-auto h-8 rounded-full font-sans"
      >
        <Eye className="w-3.5 h-3.5 mr-1.5" />
        {isActive ? 'Previewing' : 'Preview'}
      </Button>
    </div>
  );
}
