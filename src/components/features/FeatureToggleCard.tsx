import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Lock, AlertCircle, Puzzle, LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { MergedFeature } from '@/hooks/useOrganizationFeatures';
import { DisableFeatureDialog } from './DisableFeatureDialog';

// Helper to get icon by name
function getIconByName(iconName: string | null): LucideIcon | null {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || null;
}

interface FeatureToggleCardProps {
  feature: MergedFeature;
  onToggle: (featureKey: string, isEnabled: boolean) => void;
  isUpdating?: boolean;
  canManage?: boolean;
}

export function FeatureToggleCard({
  feature,
  onToggle,
  isUpdating = false,
  canManage = true,
}: FeatureToggleCardProps) {
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const IconComponent = getIconByName(feature.icon_name);

  const handleToggleClick = (checked: boolean) => {
    if (!checked && feature.is_enabled) {
      // Show confirmation dialog when disabling
      setShowDisableDialog(true);
    } else {
      // Enable directly
      onToggle(feature.feature_key, checked);
    }
  };

  const handleConfirmDisable = () => {
    onToggle(feature.feature_key, false);
    setShowDisableDialog(false);
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center justify-between gap-4 rounded-lg border p-4 transition-all',
          feature.is_enabled
            ? 'border-border bg-card hover:border-primary/30'
            : 'border-muted bg-muted/30',
          feature.is_core && 'border-primary/20 bg-primary/5'
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              feature.is_enabled
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
          {IconComponent ? (
              <IconComponent className="h-5 w-5" />
            ) : (
              <Puzzle className="h-5 w-5" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={cn(
                  'font-medium',
                  !feature.is_enabled && 'text-muted-foreground'
                )}
              >
                {feature.feature_name}
              </h4>
              {feature.is_core && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="h-3 w-3" />
                  Core
                </Badge>
              )}
              {!feature.is_enabled && !feature.is_core && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Disabled
                </Badge>
              )}
            </div>
            <p
              className={cn(
                'mt-1 text-sm',
                feature.is_enabled
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/70'
              )}
            >
              {feature.description}
            </p>
            {!feature.is_enabled && feature.disabled_at && (
              <p className="mt-1.5 text-xs text-muted-foreground/60">
                Data preserved • Disabled{' '}
                {new Date(feature.disabled_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div className="shrink-0">
          {feature.is_core ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Always on</span>
            </div>
          ) : (
            <Switch
              checked={feature.is_enabled}
              onCheckedChange={handleToggleClick}
              disabled={isUpdating || !canManage}
              aria-label={`Toggle ${feature.feature_name}`}
            />
          )}
        </div>
      </div>

      <DisableFeatureDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
        featureName={feature.feature_name}
        onConfirm={handleConfirmDisable}
      />
    </>
  );
}
