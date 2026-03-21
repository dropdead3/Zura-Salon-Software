import { useState } from 'react';
import { Search, Filter, Blocks, Info } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturesByCategory, useToggleOrganizationFeature, useBulkToggleFeatures } from '@/hooks/useOrganizationFeatures';
import { FeatureCategorySection } from '@/components/features/FeatureCategorySection';

type FilterState = 'all' | 'enabled' | 'disabled';

interface ModulesTabProps {
  canManage: boolean;
}

export function ModulesTab({ canManage }: ModulesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const { effectiveOrganization } = useOrganizationContext();

  const {
    features,
    groupedFeatures,
    sortedCategories,
    categoryInfo,
    isLoading,
    error,
  } = useFeaturesByCategory();

  const toggleFeature = useToggleOrganizationFeature();
  const bulkToggle = useBulkToggleFeatures();

  const isUpdating = toggleFeature.isPending || bulkToggle.isPending;

  // Filter features by search and state
  const filterFeatures = (features: typeof groupedFeatures[string]) => {
    return features.filter(feature => {
      const matchesSearch = !searchQuery || 
        feature.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesState = 
        filterState === 'all' ||
        (filterState === 'enabled' && feature.is_enabled) ||
        (filterState === 'disabled' && !feature.is_enabled);

      return matchesSearch && matchesState;
    });
  };

  const handleToggle = (featureKey: string, isEnabled: boolean) => {
    toggleFeature.mutate({ featureKey, isEnabled });
  };

  const handleBulkToggle = (featureKeys: string[], isEnabled: boolean) => {
    bulkToggle.mutate({ featureKeys, isEnabled });
  };

  // Calculate stats
  const totalFeatures = features?.length || 0;
  const enabledFeatures = features?.filter(f => f.is_enabled).length || 0;
  const coreFeatures = features?.filter(f => f.is_core).length || 0;

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load modules. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Blocks className="h-4 w-4" />
            Organization Modules
          </CardTitle>
          <CardDescription>
            Enable or disable business capabilities for your organization. Disabled modules hide all related UI but preserve data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              {enabledFeatures} of {totalFeatures} enabled
            </Badge>
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              {coreFeatures} core (always on)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {filterState === 'all' ? 'All' : filterState === 'enabled' ? 'Enabled' : 'Disabled'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={filterState === 'all'}
              onCheckedChange={() => setFilterState('all')}
            >
              All Modules
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterState === 'enabled'}
              onCheckedChange={() => setFilterState('enabled')}
            >
              Enabled Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterState === 'disabled'}
              onCheckedChange={() => setFilterState('disabled')}
            >
              Disabled Only
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Platform user info banner */}
      {!effectiveOrganization && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-warning-foreground">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">
                Viewing catalog defaults. Select an organization to see org-specific settings.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Categories */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map(category => {
            const filteredFeatures = filterFeatures(groupedFeatures[category]);
            if (filteredFeatures.length === 0) return null;

            const info = categoryInfo[category] || { 
              label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              icon: 'Folder',
            };

            return (
              <FeatureCategorySection
                key={category}
                category={category}
                categoryLabel={info.label}
                categoryIcon={info.icon}
                features={filteredFeatures}
                onToggle={handleToggle}
                onBulkToggle={category !== 'core' ? handleBulkToggle : undefined}
                isUpdating={isUpdating}
                canManage={canManage}
                defaultOpen={category === 'core' || filteredFeatures.some(f => !f.is_enabled)}
              />
            );
          })}
          
          {/* Empty state */}
          {sortedCategories.every(cat => filterFeatures(groupedFeatures[cat]).length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No modules match your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How modules work</p>
          <p>
            Disabling a module hides it from navigation and UI, but all data is preserved. 
            Re-enabling restores everything to its previous state. Core modules cannot be disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
