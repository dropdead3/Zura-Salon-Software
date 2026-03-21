/**
 * THEME VERSION MIGRATION
 *
 * Pure functions for diffing blueprints and generating migration plans
 * when a theme is upgraded to a new version.
 */

import type {
  ThemeBlueprint,
  BlueprintDiff,
} from '@/types/theme-infrastructure';
import type { SectionConfig } from '@/hooks/useWebsiteSections';

interface PageConfig {
  id: string;
  slug: string;
  sections: SectionConfig[];
}

interface SiteState {
  pages: PageConfig[];
  tokenOverrides: Record<string, string>;
}

// ─── Blueprint Diffing ──────────────────────────────────────

export function diffBlueprints(
  oldBp: ThemeBlueprint,
  newBp: ThemeBlueprint
): BlueprintDiff {
  const oldPages = new Set(oldBp.required_pages);
  const addedRequiredPages = newBp.required_pages.filter(p => !oldPages.has(p));

  const newAllowed = new Set(newBp.allowed_section_types);
  const removedSectionTypes = oldBp.allowed_section_types.filter(t => !newAllowed.has(t));

  const changedNavLimits: BlueprintDiff['changedNavLimits'] = [];
  const navFields = ['max_top_level_items', 'max_depth', 'max_cta_items'] as const;
  for (const field of navFields) {
    const oldVal = oldBp.default_navigation[field];
    const newVal = newBp.default_navigation[field];
    if (typeof oldVal === 'number' && typeof newVal === 'number' && oldVal !== newVal) {
      changedNavLimits.push({ field, old: oldVal, new: newVal });
    }
  }

  const changedTokenDefaults: BlueprintDiff['changedTokenDefaults'] = [];
  for (const [key, newVal] of Object.entries(newBp.token_overrides.defaults)) {
    const oldVal = oldBp.token_overrides.defaults[key];
    if (oldVal !== newVal) {
      changedTokenDefaults.push({ key, old: oldVal ?? '', new: newVal });
    }
  }

  return {
    addedRequiredPages,
    removedSectionTypes,
    changedNavLimits,
    newRequiredSlots: [], // Populated when slot mappings are diffed
    changedTokenDefaults,
  };
}

// ─── Migration Plan Generation ──────────────────────────────

export interface MigrationPlanItem {
  description: string;
  impact: string;
  type: 'auto' | 'review' | 'breaking';
}

export interface MigrationPlan {
  items: MigrationPlanItem[];
  hasBreakingChanges: boolean;
  summary: string;
}

export function generateMigrationPlan(
  diff: BlueprintDiff,
  siteState: SiteState
): MigrationPlan {
  const items: MigrationPlanItem[] = [];

  // Added required pages
  for (const page of diff.addedRequiredPages) {
    const exists = siteState.pages.some(p => p.id === page);
    items.push({
      description: exists
        ? `Page "${page}" already exists and will satisfy new requirement`
        : `New required page "${page}" needs to be created`,
      impact: exists ? 'No action needed' : 'Page will be auto-created from template',
      type: exists ? 'auto' : 'review',
    });
  }

  // Removed section types
  for (const sectionType of diff.removedSectionTypes) {
    const inUse = siteState.pages.some(p =>
      p.sections.some(s => s.type === sectionType && s.enabled)
    );
    if (inUse) {
      const affected = siteState.pages
        .filter(p => p.sections.some(s => s.type === sectionType && s.enabled))
        .map(p => p.id);
      items.push({
        description: `Section type "${sectionType}" is no longer supported`,
        impact: `Used on pages: ${affected.join(', '}. Sections will be disabled.`,
        type: 'breaking',
      });
    }
  }

  // Nav limit changes
  for (const change of diff.changedNavLimits) {
    items.push({
      description: `Navigation ${change.field} changed from ${change.old} to ${change.new}`,
      impact: change.new < change.old
        ? 'Current navigation may exceed new limits'
        : 'No action needed — limit increased',
      type: change.new < change.old ? 'review' : 'auto',
    });
  }

  // Token default changes
  for (const change of diff.changedTokenDefaults) {
    const hasOverride = change.key in siteState.tokenOverrides;
    items.push({
      description: `Default token "${change.key}" changed`,
      impact: hasOverride
        ? 'Your custom override will be preserved'
        : `Will update from "${change.old}" to "${change.new}"`,
      type: hasOverride ? 'auto' : 'review',
    });
  }

  return {
    items,
    hasBreakingChanges: items.some(i => i.type === 'breaking'),
    summary: `${items.filter(i => i.type === 'auto').length} auto, ${items.filter(i => i.type === 'review').length} review, ${items.filter(i => i.type === 'breaking').length} breaking`,
  };
}

// ─── Apply Migration ────────────────────────────────────────

export function applyMigration(
  plan: MigrationPlan,
  siteState: SiteState,
  newBlueprint: ThemeBlueprint
): SiteState {
  let pages = [...siteState.pages.map(p => ({ ...p, sections: [...p.sections] }))];
  const tokenOverrides = { ...siteState.tokenOverrides };

  // Disable removed section types
  for (const item of plan.items.filter(i => i.type === 'breaking')) {
    const match = item.description.match(/Section type "(.+)" is no longer supported/);
    if (match) {
      const removedType = match[1];
      pages = pages.map(p => ({
        ...p,
        sections: p.sections.map(s =>
          s.type === removedType ? { ...s, enabled: false } : s
        ),
      }));
    }
  }

  // Add missing required pages
  for (const requiredPageId of newBlueprint.required_pages) {
    if (!pages.find(p => p.id === requiredPageId)) {
      const template = newBlueprint.default_page_templates[requiredPageId];
      pages.push({
        id: requiredPageId,
        slug: requiredPageId,
        sections: (template?.sections ?? []) as SectionConfig[],
      });
    }
  }

  return { pages, tokenOverrides };
}
