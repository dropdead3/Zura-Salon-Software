import { useMemo } from 'react';
import type { MenuItem } from '@/hooks/useWebsiteMenus';
import type { WebsitePagesConfig } from '@/hooks/useWebsitePages';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  itemId?: string;
}

/** Validate menu items against pages config */
export function useMenuValidation(
  items: MenuItem[] | null | undefined,
  pagesConfig: WebsitePagesConfig | null | undefined
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  return useMemo(() => {
    if (!items) return { errors: [], warnings: [] };

    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const topLevelItems = items.filter(i => !i.parent_id);
    const ctaItems = items.filter(i => i.item_type === 'cta');

    // Count nesting depth
    const getDepth = (item: MenuItem): number => {
      if (!item.parent_id) return 0;
      const parent = items.find(i => i.id === item.parent_id);
      return parent ? 1 + getDepth(parent) : 0;
    };

    for (const item of items) {
      // Empty label
      if (!item.label.trim()) {
        errors.push({ level: 'error', message: 'Empty label', itemId: item.id });
      }

      // Page link validation
      if (item.item_type === 'page_link' && item.target_page_id && pagesConfig) {
        const page = pagesConfig.pages.find(p => p.id === item.target_page_id);
        if (!page) {
          errors.push({ level: 'error', message: `"${item.label}" links to a missing page`, itemId: item.id });
        } else if (!page.enabled) {
          errors.push({ level: 'error', message: `"${item.label}" links to a disabled page`, itemId: item.id });
        }
      }

      // External URL validation
      if (item.item_type === 'external_url') {
        if (item.target_url && !item.target_url.startsWith('https://') && !item.target_url.startsWith('http://')) {
          errors.push({ level: 'error', message: `"${item.label}" has an invalid URL (must start with https://)`, itemId: item.id });
        }
        if (!item.target_url) {
          errors.push({ level: 'error', message: `"${item.label}" has no URL`, itemId: item.id });
        }
      }

      // Nesting depth
      if (getDepth(item) > 2) {
        errors.push({ level: 'error', message: `"${item.label}" exceeds max nesting depth (2 levels)`, itemId: item.id });
      }

      // Label length warning
      if (item.label.length > 30) {
        warnings.push({ level: 'warning', message: `"${item.label}" is longer than 30 characters`, itemId: item.id });
      }

      // Meaningless label warning
      const meaningless = ['click here', 'link', 'read more', 'here'];
      if (meaningless.includes(item.label.toLowerCase().trim())) {
        warnings.push({ level: 'warning', message: `"${item.label}" is not descriptive link text`, itemId: item.id });
      }
    }

    // CTA count
    if (ctaItems.length > 2) {
      errors.push({ level: 'error', message: `Too many CTA items (${ctaItems.length}, max 2)` });
    }

    // Top-level count warning
    if (topLevelItems.length > 8) {
      warnings.push({ level: 'warning', message: `${topLevelItems.length} top-level items may crowd the navbar` });
    }

    // Duplicate labels at same level
    const labelsByParent = new Map<string, string[]>();
    for (const item of items) {
      const key = item.parent_id ?? '__root__';
      if (!labelsByParent.has(key)) labelsByParent.set(key, []);
      labelsByParent.get(key)!.push(item.label);
    }
    for (const [, labels] of labelsByParent) {
      const seen = new Set<string>();
      for (const label of labels) {
        const lower = label.toLowerCase().trim();
        if (seen.has(lower)) {
          warnings.push({ level: 'warning', message: `Duplicate label "${label}" at the same level` });
        }
        seen.add(lower);
      }
    }

    return { errors, warnings };
  }, [items, pagesConfig]);
}
