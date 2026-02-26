/**
 * THEME VALIDATION ENGINE
 *
 * Pure functions that validate site state against a ThemeBlueprint.
 * No hooks, no side effects. Used by publish flow and integrity scoring.
 */

import type {
  ThemeBlueprint,
  ValidationResult,
  PublishReadiness,
  SlotBindingResult,
} from '@/types/theme-infrastructure';
import type { SectionConfig } from '@/hooks/useWebsiteSections';

interface PageConfig {
  id: string;
  slug: string;
  sections: SectionConfig[];
}

interface NavItem {
  id: string;
  label: string;
  children?: NavItem[];
}

// ─── Page Validation ────────────────────────────────────────

export function validateRequiredPages(
  pages: PageConfig[],
  blueprint: ThemeBlueprint
): ValidationResult[] {
  const pageIds = new Set(pages.map(p => p.id));
  return blueprint.required_pages.map(requiredId => ({
    rule: 'required_page',
    severity: 'critical' as const,
    passed: pageIds.has(requiredId),
    message: pageIds.has(requiredId)
      ? `Required page "${requiredId}" exists`
      : `Required page "${requiredId}" is missing`,
    affectedEntity: { type: 'page', id: requiredId },
  }));
}

// ─── Section Validation ─────────────────────────────────────

export function validateRequiredSections(
  pages: PageConfig[],
  blueprint: ThemeBlueprint
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const allSections = pages.flatMap(p => p.sections.filter(s => s.enabled));

  // Check allowed section types
  for (const section of allSections) {
    if (
      blueprint.allowed_section_types.length > 0 &&
      !blueprint.allowed_section_types.includes(section.type)
    ) {
      results.push({
        rule: 'allowed_section_type',
        severity: 'warning',
        passed: false,
        message: `Section type "${section.type}" is not in the allowed list for this theme`,
        affectedEntity: { type: 'section', id: section.id },
      });
    }
  }

  // Check section limits
  for (const [sectionType, limit] of Object.entries(blueprint.section_limits)) {
    for (const page of pages) {
      const count = page.sections.filter(s => s.type === sectionType && s.enabled).length;
      if (count > limit.max) {
        results.push({
          rule: 'section_limit',
          severity: 'warning',
          passed: false,
          message: `Page "${page.id}" has ${count} "${sectionType}" sections (max: ${limit.max})`,
          affectedEntity: { type: 'page', id: page.id },
        });
      }
    }
  }

  return results;
}

// ─── Navigation Validation ──────────────────────────────────

export function validateNavigation(
  menuItems: NavItem[],
  blueprint: ThemeBlueprint
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const nav = blueprint.default_navigation;

  // Top-level count
  if (menuItems.length > nav.max_top_level_items) {
    results.push({
      rule: 'nav_max_items',
      severity: 'warning',
      passed: false,
      message: `Navigation has ${menuItems.length} top-level items (max: ${nav.max_top_level_items})`,
      affectedEntity: { type: 'navigation', id: 'root' },
    });
  } else {
    results.push({
      rule: 'nav_max_items',
      severity: 'info',
      passed: true,
      message: `Navigation item count within limits`,
      affectedEntity: { type: 'navigation', id: 'root' },
    });
  }

  // Depth check
  function maxDepth(items: NavItem[], depth: number): number {
    if (!items.length) return depth;
    return Math.max(...items.map(i => maxDepth(i.children ?? [], depth + 1)));
  }

  const actualDepth = maxDepth(menuItems, 0);
  if (actualDepth > nav.max_depth) {
    results.push({
      rule: 'nav_max_depth',
      severity: 'warning',
      passed: false,
      message: `Navigation depth is ${actualDepth} (max: ${nav.max_depth})`,
      affectedEntity: { type: 'navigation', id: 'root' },
    });
  }

  return results;
}

// ─── Slot Requirements Validation ───────────────────────────

export function validateSlotRequirements(
  slots: SlotBindingResult[]
): ValidationResult[] {
  return slots
    .filter(s => s.slot.required)
    .map(s => ({
      rule: 'required_slot',
      severity: 'critical' as const,
      passed: s.resolution.source !== 'empty',
      message: s.resolution.source !== 'empty'
        ? `Required slot "${s.slotId}" is bound`
        : `Required slot "${s.slotId}" has no content`,
      affectedEntity: { type: 'slot', id: s.slotId },
    }));
}

// ─── Performance Budget ─────────────────────────────────────

export function validatePerformanceBudget(
  pages: PageConfig[],
  sectionWeights: Record<string, number>,
  maxWeight: number
): ValidationResult[] {
  return pages.map(page => {
    const weight = page.sections
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + (sectionWeights[s.type] ?? 1), 0);
    return {
      rule: 'performance_budget',
      severity: (weight > maxWeight ? 'warning' : 'info') as 'warning' | 'info',
      passed: weight <= maxWeight,
      message: weight <= maxWeight
        ? `Page "${page.id}" weight ${weight}/${maxWeight}`
        : `Page "${page.id}" exceeds performance budget (${weight}/${maxWeight})`,
      affectedEntity: { type: 'page', id: page.id },
    };
  });
}

// ─── Publish Readiness ──────────────────────────────────────

export function validatePublishReadiness(
  allResults: ValidationResult[]
): PublishReadiness {
  const critical = allResults.filter(r => !r.passed && r.severity === 'critical');
  const warnings = allResults.filter(r => !r.passed && r.severity === 'warning');
  const info = allResults.filter(r => r.severity === 'info');

  return {
    canPublish: critical.length === 0,
    critical,
    warnings,
    info,
  };
}
