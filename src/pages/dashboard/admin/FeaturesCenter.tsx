import { useState } from 'react';
import { Search, Filter, Blocks } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useFeaturesByCategory, useToggleOrganizationFeature, useBulkToggleFeatures } from '@/hooks/useOrganizationFeatures';
import { FeatureCategorySection } from '@/components/features/FeatureCategorySection';

type FilterState = 'all' | 'enabled' | 'disabled';

export default function FeaturesCenter() {
  const { roles, isPlatformUser } = useAuth();
  const isSuperAdmin = roles.includes('super_admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<FilterState>('all');

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

  const canManage = isSuperAdmin || isPlatformUser;
  const isUpdating = toggleFeature.isPending || bulkToggle.isPending;

  // Filter features by search and state
  const filterFeatures = (features: typeof groupedFeatures[string]) => {
    return features.filter(feature => {
      // Search filter
      const matchesSearch = !searchQuery || 
        feature.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // State filter
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
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            Failed to load features. Please try again.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Features Center"
          description="Customize which features are available in your organization"
        />

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            {enabledFeatures} of {totalFeatures} features enabled
          </Badge>
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            {coreFeatures} core features
          </Badge>
          {!canManage && (
            <Badge variant="destructive" className="text-sm py-1.5 px-3">
              View Only
            </Badge>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search features..."
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
                onCheckedChange={() => setFilterState('all'}
              >
                All Features
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterState === 'enabled'}
                onCheckedChange={() => setFilterState('enabled'}
              >
                Enabled Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterState === 'disabled'}
                onCheckedChange={() => setFilterState('disabled'}
              >
                Disabled Only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Feature Categories */}
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
                <p>No features match your search criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
