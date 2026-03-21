import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { FeatureToggleCard } from './FeatureToggleCard';
import type { MergedFeature } from '@/hooks/useOrganizationFeatures';

// Helper to get icon by name
function getIconByName(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || Folder;
}

interface FeatureCategorySectionProps {
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  features: MergedFeature[];
  onToggle: (featureKey: string, isEnabled: boolean) => void;
  onBulkToggle?: (featureKeys: string[], isEnabled: boolean) => void;
  isUpdating?: boolean;
  canManage?: boolean;
  defaultOpen?: boolean;
}

export function FeatureCategorySection({
  category,
  categoryLabel,
  categoryIcon,
  features,
  onToggle,
  onBulkToggle,
  isUpdating = false,
  canManage = true,
  defaultOpen = true,
}: FeatureCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const IconComponent = getIconByName(categoryIcon);

  // Count enabled features (excluding core)
  const toggleableFeatures = features.filter(f => !f.is_core);
  const enabledCount = toggleableFeatures.filter(f => f.is_enabled).length;
  const totalCount = toggleableFeatures.length;
  const allEnabled = enabledCount === totalCount && totalCount > 0;
  const isCore = category === 'core';

  const handleBulkToggle = () => {
    if (!onBulkToggle || !canManage) return;
    const featureKeys = toggleableFeatures.map(f => f.feature_key);
    onBulkToggle(featureKeys, !allEnabled);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-between gap-4 p-4 cursor-pointer transition-colors',
              'hover:bg-muted/50',
              isOpen && 'border-b'
            )}
          >
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  isCore ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">{categoryLabel}</h3>
                {!isCore && (
                  <p className="text-sm text-muted-foreground">
                    {enabledCount} of {totalCount} enabled
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isCore ? (
                <Badge variant="outline" className="text-xs">
                  Always Active
                </Badge>
              ) : (
                <>
                  {/* Progress indicator */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${totalCount > 0 ? (enabledCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {enabledCount}/{totalCount}
                    </span>
                  </div>
                  
                  {/* Bulk toggle button */}
                  {canManage && onBulkToggle && totalCount > 0 && (
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkToggle();
                      }}
                      disabled={isUpdating}
                      className="text-xs"
                    >
                      {allEnabled ? 'Disable All' : 'Enable All'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-4 space-y-3">
            {features.map(feature => (
              <FeatureToggleCard
                key={feature.feature_key}
                feature={feature}
                onToggle={onToggle}
                isUpdating={isUpdating}
                canManage={canManage}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
