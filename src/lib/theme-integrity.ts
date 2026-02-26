/**
 * THEME INTEGRITY SCORING
 *
 * Pure scoring function: 0–100 integrity score based on blueprint compliance.
 * Informational only — not gamified.
 */

import type {
  ThemeBlueprint,
  ThemeIntegrityScore,
  IntegrityDimension,
  SlotBindingResult,
} from '@/types/theme-infrastructure';
import type { SectionConfig } from '@/hooks/useWebsiteSections';

interface PageConfig {
  id: string;
  sections: SectionConfig[];
}

interface NavItem {
  id: string;
  children?: NavItem[];
}

// ─── Dimension Calculators ──────────────────────────────────

function scoreSections(pages: PageConfig[], blueprint: ThemeBlueprint): IntegrityDimension {
  const max = 25;
  const violations: string[] = [];

  // Check required pages have at least one enabled section
  for (const requiredPageId of blueprint.required_pages) {
    const page = pages.find(p => p.id === requiredPageId);
    if (!page) {
      violations.push(`Missing required page: ${requiredPageId}`);
      continue;
    }
    const enabledCount = page.sections.filter(s => s.enabled).length;
    if (enabledCount === 0) {
      violations.push(`Page "${requiredPageId}" has no enabled sections`);
    }
  }

  // Check section limit violations
  for (const [sectionType, limit] of Object.entries(blueprint.section_limits)) {
    for (const page of pages) {
      const count = page.sections.filter(s => s.type === sectionType && s.enabled).length;
      if (count > limit.max) {
        violations.push(`"${page.id}" exceeds ${sectionType} limit (${count}/${limit.max})`);
      }
    }
  }

  const deduction = Math.min(max, violations.length * 5);
  return { score: max - deduction, max, violations };
}

function scoreNavigation(navItems: NavItem[], blueprint: ThemeBlueprint): IntegrityDimension {
  const max = 20;
  const violations: string[] = [];
  const nav = blueprint.default_navigation;

  if (navItems.length > nav.max_top_level_items) {
    violations.push(`${navItems.length} top-level items (max ${nav.max_top_level_items})`);
  }

  function depth(items: NavItem[], d: number): number {
    if (!items.length) return d;
    return Math.max(...items.map(i => depth(i.children ?? [], d + 1)));
  }

  const d = depth(navItems, 0);
  if (d > nav.max_depth) {
    violations.push(`Nav depth ${d} exceeds max ${nav.max_depth}`);
  }

  const deduction = Math.min(max, violations.length * 10);
  return { score: max - deduction, max, violations };
}

function scoreTokenDrift(
  overrides: Record<string, string>,
  blueprint: ThemeBlueprint
): IntegrityDimension {
  const max = 15;
  const violations: string[] = [];
  const lockable = new Set(blueprint.token_overrides.lockable);

  for (const key of Object.keys(overrides)) {
    if (lockable.has(key) && blueprint.locking.token_layer_locked) {
      violations.push(`Override on locked token: ${key}`);
    }
  }

  const overrideCount = Object.keys(overrides).length;
  // Minor deduction per override beyond 5
  const excess = Math.max(0, overrideCount - 5);
  const driftPenalty = Math.min(max, violations.length * 5 + excess);
  return { score: max - driftPenalty, max, violations };
}

function scoreSlotCoverage(slots: SlotBindingResult[]): IntegrityDimension {
  const max = 20;
  const violations: string[] = [];

  const requiredSlots = slots.filter(s => s.slot.required);
  const emptyRequired = requiredSlots.filter(s => s.resolution.source === 'empty');

  for (const s of emptyRequired) {
    violations.push(`Empty required slot: ${s.slotId}`);
  }

  // Also count optional empty slots as minor
  const totalEmpty = slots.filter(s => s.resolution.source === 'empty').length;
  const coverageRatio = slots.length > 0 ? (slots.length - totalEmpty) / slots.length : 1;
  const coverageScore = Math.round(max * coverageRatio);
  const deduction = Math.min(max - coverageScore, emptyRequired.length * 5);

  return { score: Math.max(0, coverageScore - deduction), max, violations };
}

function scorePageCoverage(pages: PageConfig[], blueprint: ThemeBlueprint): IntegrityDimension {
  const max = 10;
  const violations: string[] = [];

  for (const requiredId of blueprint.required_pages) {
    if (!pages.find(p => p.id === requiredId)) {
      violations.push(`Missing required page: ${requiredId}`);
    }
  }

  // Check for orphaned pages (pages not in any nav or template)
  const knownPages = new Set([
    ...blueprint.required_pages,
    ...Object.keys(blueprint.default_page_templates),
  ]);
  for (const page of pages) {
    if (!knownPages.has(page.id) && page.id !== 'home') {
      violations.push(`Orphaned page: ${page.id}`);
    }
  }

  const deduction = Math.min(max, violations.length * 3);
  return { score: max - deduction, max, violations };
}

function scoreCtaCompliance(
  pages: PageConfig[],
  blueprint: ThemeBlueprint
): IntegrityDimension {
  const max = 10;
  const violations: string[] = [];

  if (!blueprint.default_navigation.required_cta) {
    return { score: max, max, violations };
  }

  // Check if at least one CTA-type section exists
  const ctaSections = pages.flatMap(p =>
    p.sections.filter(s => s.enabled && ['new_client', 'custom_cta'].includes(s.type))
  );

  if (ctaSections.length === 0) {
    violations.push('No CTA sections found across any page');
  }

  const deduction = Math.min(max, violations.length * 10);
  return { score: max - deduction, max, violations };
}

// ─── Main Calculator ────────────────────────────────────────

export function calculateIntegrity(
  blueprint: ThemeBlueprint,
  pages: PageConfig[],
  navigation: NavItem[],
  resolvedSlots: SlotBindingResult[],
  tokenOverrides: Record<string, string> = {}
): ThemeIntegrityScore {
  const breakdown = {
    required_sections: scoreSections(pages, blueprint),
    navigation: scoreNavigation(navigation, blueprint),
    token_drift: scoreTokenDrift(tokenOverrides, blueprint),
    slot_coverage: scoreSlotCoverage(resolvedSlots),
    page_coverage: scorePageCoverage(pages, blueprint),
    cta_compliance: scoreCtaCompliance(pages, blueprint),
  };

  const score = Object.values(breakdown).reduce((sum, d) => sum + d.score, 0);
  const totalViolations = Object.values(breakdown).reduce((sum, d) => sum + d.violations.length, 0);

  let status: ThemeIntegrityScore['status'] = 'healthy';
  if (score < 50 || totalViolations > 5) status = 'critical';
  else if (score < 75 || totalViolations > 2) status = 'warning';

  return { score, breakdown, status };
}
