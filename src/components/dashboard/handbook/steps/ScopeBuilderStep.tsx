import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useSectionLibrary, useUpsertSelectedSections } from '@/hooks/handbook/useHandbookData';
import { useHandbookPolicySections } from '@/hooks/handbook/useHandbookPolicySections';
import { ROLE_OPTIONS } from '@/lib/handbook/brandTones';
import { SectionLibraryCard } from '../SectionLibraryCard';
import { ApplicabilityMatrix } from '../ApplicabilityMatrix';
import { HandbookSectionEditor } from '../HandbookSectionEditor';
import { sectionHasPolicyOption } from '@/lib/handbook/policySectionMap';

interface Props {
  versionId: string;
  setup: any;
  selectedSections: any[];
  primaryRole?: string | null;
}

export function ScopeBuilderStep({ versionId, setup, selectedSections, primaryRole }: Props) {
  const { data: library = [], isLoading } = useSectionLibrary();
  const upsert = useUpsertSelectedSections(versionId);

  const initialKeys = useMemo(() => {
    if (selectedSections.length > 0) return new Set(selectedSections.map((s) => s.library_section_key));
    // Smart default: required + recommended, role-filtered when primaryRole is set
    return new Set(
      library
        .filter((s: any) => {
          if (s.recommendation === 'optional') return false;
          if (!primaryRole) return true;
          const defaultRoles: string[] = s.default_roles || [];
          // Empty default_roles = universal section; include for any role
          if (defaultRoles.length === 0) return true;
          return defaultRoles.includes(primaryRole);
        })
        .map((s: any) => s.key)
    );
  }, [library, selectedSections, primaryRole]);

  const [selected, setSelected] = useState<Set<string>>(initialKeys);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSave = () => {
    const entries = library.filter((s: any) => selected.has(s.key));
    upsert.mutate(entries);
  };

  const grouped = useMemo(() => {
    const out: Record<string, any[]> = {};
    library.forEach((s: any) => {
      if (!out[s.category]) out[s.category] = [];
      out[s.category].push(s);
    });
    return out;
  }, [library]);

  const categoryLabels: Record<string, string> = {
    foundation: 'Foundation',
    operations: 'Operations',
    benefits: 'Benefits & Time Off',
    conduct: 'Conduct & Standards',
    safety: 'Safety & Compliance',
    separation: 'Separation & Acknowledgment',
  };

  const enabledRoles: string[] = primaryRole ? [primaryRole] : (setup?.roles_enabled || []);
  const enabledEmployment: string[] = Object.entries(setup?.classifications || {}).filter(([, v]) => v).map(([k]) => k);
  const lockedRoleLabel = primaryRole
    ? ROLE_OPTIONS.find((r) => r.key === primaryRole)?.label || primaryRole.replace(/_/g, ' ')
    : null;

  // Build preview sections from current selection
  const previewSections = useMemo(() => {
    return library
      .filter((s: any) => selected.has(s.key))
      .map((s: any) => ({
        id: s.key,
        title: s.title,
        applies_to: {
          employment_types: s.default_employment_types || [],
          roles: primaryRole ? [primaryRole] : (s.default_roles || []),
          locations: [],
        },
      }));
  }, [library, selected, primaryRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className={cn(tokens.heading.section)}>Scope Builder</h2>
          <p className="font-sans text-sm text-muted-foreground mt-1 max-w-2xl">
            Choose the sections your handbook should include. We've pre-selected required and recommended sections — adjust to match your operation.
          </p>
          {primaryRole && (
            <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-md bg-primary/5 border border-primary/20 max-w-fit">
              <Lock className="w-3 h-3 text-primary" />
              <span className="font-sans text-xs text-foreground">
                Filtered for <span className="font-medium">{lockedRoleLabel}</span>
              </span>
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending} className="font-sans">
          {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save selection ({selected.size})
        </Button>
      </div>

      {Object.entries(grouped).map(([category, sections]) => (
        <div key={category} className="space-y-3">
          <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {sections.map((s) => (
              <SectionLibraryCard key={s.key} section={s} selected={selected.has(s.key)} onToggle={toggle} />
            ))}
          </div>
        </div>
      ))}

      <div className="pt-4">
        <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase mb-3">Applicability Preview</h3>
        <ApplicabilityMatrix
          sections={previewSections}
          enabledRoles={enabledRoles}
          enabledEmploymentTypes={enabledEmployment}
          singleRole={primaryRole || undefined}
        />
      </div>
    </div>
  );
}
