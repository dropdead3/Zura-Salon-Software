/**
 * PageExplainer — Standardized page-level explainer component.
 * 
 * Pulls content from the centralized registry in src/config/pageExplainers.ts.
 * Every dashboard page should include one immediately after the page header.
 * 
 * Usage:
 *   <PageExplainer pageId="analytics-hub" />
 */

import { PAGE_EXPLAINERS } from '@/config/pageExplainers';
import { Infotainer } from './Infotainer';
import { cn } from '@/lib/utils';

interface PageExplainerProps {
  /** The page ID matching an entry in PAGE_EXPLAINERS registry */
  pageId: string;
  /** Optional className override */
  className?: string;
}

export function PageExplainer({ pageId, className }: PageExplainerProps) {
  const entry = PAGE_EXPLAINERS[pageId];

  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[PageExplainer] No registry entry found for pageId="${pageId}". Add it to src/config/pageExplainers.ts`);
    }
    return null;
  }

  const IconComponent = entry.icon;

  return (
    <Infotainer
      id={`page-explainer-${pageId}`}
      title={entry.title}
      description={entry.description}
      icon={IconComponent ? <IconComponent className="h-4 w-4" /> : undefined}
      className={cn('mb-6', className)}
    />
  );
}
