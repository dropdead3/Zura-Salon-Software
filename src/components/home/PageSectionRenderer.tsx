import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { BrandStatement } from '@/components/home/BrandStatement';
import { ExtensionsSection } from '@/components/home/ExtensionsSection';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { PopularServices } from '@/components/home/PopularServices';
import { NewClientSection } from '@/components/home/NewClientSection';
import { LocationsSection } from '@/components/home/LocationsSection';
import { StylistsSection } from '@/components/home/StylistsSection';
import { GallerySection } from '@/components/home/GallerySection';
import { TestimonialSection } from '@/components/home/TestimonialSection';
import { FAQSection } from '@/components/home/FAQSection';
import { BrandsSection } from '@/components/home/BrandsSection';
import { DrinkMenuSection } from '@/components/home/DrinkMenuSection';
import { CustomSectionRenderer } from '@/components/home/CustomSectionRenderer';
import { SectionStyleWrapper } from '@/components/home/SectionStyleWrapper';
import { isBuiltinSection, type BuiltinSectionType, type CustomSectionType, type SectionConfig } from '@/hooks/useWebsiteSections';

const FULL_BLEED_SECTIONS = new Set<string>(['hero', 'gallery', 'new_client', 'brand_statement', 'extensions']);

import { EditorSectionCard } from '@/components/home/EditorSectionCard';
import { InsertionLine } from '@/components/home/InsertionLine';

function getBuiltinComponent(type: BuiltinSectionType, isPreview: boolean): React.ReactNode {
  switch (type) {
    case 'hero': return <HeroSection isPreview={isPreview} />;
    case 'brand_statement': return <BrandStatement />;
    case 'testimonials': return <TestimonialSection />;
    case 'services_preview': return <ServicesPreview />;
    case 'popular_services': return <PopularServices />;
    case 'gallery': return <GallerySection />;
    case 'new_client': return <NewClientSection />;
    case 'stylists': return <StylistsSection />;
    case 'locations': return <LocationsSection />;
    case 'faq': return <FAQSection />;
    case 'extensions': return <ExtensionsSection />;
    case 'brands': return <BrandsSection />;
    case 'drink_menu': return <DrinkMenuSection />;
    default: return null;
  }
}

// Detect editor preview mode — must be evaluated at render time, not module level,
// because this module may be loaded before the iframe URL is set.
function getIsEditorPreview() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('preview') || params.has('mode');
}

function getIsViewMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mode') === 'view';
}

interface PageSectionRendererProps {
  sections: SectionConfig[];
  /** Page id (e.g. 'home' or page slug) — used to scope live-preview reorder messages. */
  pageId?: string;
}

export function PageSectionRenderer({ sections, pageId }: PageSectionRendererProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  // While the operator is dragging in the editor rail, the parent posts the
  // in-flight order so the canvas can reflow live (premium feel). On drop or
  // when sections re-fetch, this clears.
  const [provisionalOrder, setProvisionalOrder] = useState<string[] | null>(null);
  // Latest pageId in a ref so the message handler (registered once) sees fresh values.
  const currentPageIdRef = useRef(pageId);
  useEffect(() => {
    currentPageIdRef.current = pageId;
    // When the renderer switches pages, drop any provisional order from a prior page.
    setProvisionalOrder(null);
  }, [pageId]);
  const isEditorPreview = getIsEditorPreview();
  const isViewMode = getIsViewMode();

  const enabledSections = useMemo(() => {
    const base = isEditorPreview && !isViewMode
      ? [...sections].sort((a, b) => a.order - b.order)
      : [...sections].filter(s => s.enabled).sort((a, b) => a.order - b.order);
    if (!provisionalOrder?.length) return base;
    const byId = new Map(base.map(s => [s.id, s]));
    const ordered = provisionalOrder
      .map(id => byId.get(id))
      .filter((s): s is SectionConfig => !!s);
    // Append any sections the editor didn't include (defensive — keeps content visible).
    base.forEach(s => { if (!provisionalOrder.includes(s.id)) ordered.push(s); });
    return ordered;
  }, [sections, isEditorPreview, isViewMode, provisionalOrder]);

  // Listen for postMessage from parent (Website Editor) for scroll & highlight
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (![
        'PREVIEW_SCROLL_TO_SECTION',
        'PREVIEW_HIGHLIGHT_SECTION',
        'PREVIEW_SET_ACTIVE_SECTION',
        'PREVIEW_PROVISIONAL_ORDER',
        'PREVIEW_REORDER_SECTIONS',
      ].includes(msg.type)) return;

      if (msg.type === 'PREVIEW_SCROLL_TO_SECTION') {
        const el = document.getElementById(`section-${msg.sectionId}`);
        if (el) el.scrollIntoView({ behavior: msg.behavior ?? 'smooth', block: 'start' });
      }

      if (msg.type === 'PREVIEW_HIGHLIGHT_SECTION') {
        const el = document.getElementById(`section-${msg.sectionId}`);
        if (el) {
          el.classList.add('preview-highlight');
          setTimeout(() => el.classList.remove('preview-highlight'), 1000);
        }
      }

      if (msg.type === 'PREVIEW_SET_ACTIVE_SECTION') {
        setSelectedSectionId(msg.sectionId || null);
      }

      // Live drag-reorder reflow.
      if (msg.type === 'PREVIEW_PROVISIONAL_ORDER' && Array.isArray(msg.order)) {
        // Page-scope guard: ignore messages targeting a different page than the
        // one currently rendered (operator may have switched pages mid-drag).
        if (msg.pageId && currentPageIdRef.current && msg.pageId !== currentPageIdRef.current) return;
        setProvisionalOrder(msg.order as string[]);
      }
      // Commit on drop. We KEEP the provisional layer applied — clearing it now
      // would snap the canvas back to stale cached sections (no realtime hook
      // on useWebsiteSections). The provisional order persists visually until
      // the iframe receives fresh server data via the refetch invalidation
      // fired by the editor's saveSections() through React Query.
      if (msg.type === 'PREVIEW_REORDER_SECTIONS' && Array.isArray(msg.order)) {
        if (msg.pageId && currentPageIdRef.current && msg.pageId !== currentPageIdRef.current) return;
        setProvisionalOrder(msg.order as string[]);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Notify parent iframe that sections have rendered and are ready for scroll commands
  useEffect(() => {
    if (!isEditorPreview || enabledSections.length === 0) return;
    // Small delay to ensure DOM elements are painted
    const timer = setTimeout(() => {
      try {
        window.parent.postMessage(
          { type: 'PREVIEW_READY' },
          '*'
        );
      } catch {
        // Ignore cross-origin errors
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [enabledSections.length]);

  // View mode inside editor: render exact public layout (no bento cards)
  // Also used for the public site (non-preview)
  if (!isEditorPreview || isViewMode) {
    return (
      <>
        {enabledSections.map((section) => (
          <SectionStyleWrapper key={section.id} styleOverrides={section.style_overrides}>
            <div id={`section-${section.id}`}>
              {isBuiltinSection(section.type)
                ? getBuiltinComponent(section.type, false)
                : <CustomSectionRenderer sectionId={section.id} sectionType={section.type as CustomSectionType} />
              }
            </div>
          </SectionStyleWrapper>
        ))}
      </>
    );
  }

  // Edit mode inside editor: floating bento cards
  if (isEditorPreview) {
    return (
      <div className="zura-editor-preview py-0 space-y-0">
        {enabledSections.map((section, index) => (
          <React.Fragment key={section.id}>
            {index > 0 && <InsertionLine afterSectionId={enabledSections[index - 1].id} />}
            <EditorSectionCard
              sectionId={section.id}
              sectionLabel={section.label}
              enabled={section.enabled}
              isSelected={selectedSectionId === section.id}
              fullBleed={FULL_BLEED_SECTIONS.has(section.type)}
            >
              <div id={`section-${section.id}`}>
                <SectionStyleWrapper styleOverrides={section.style_overrides}>
                  {isBuiltinSection(section.type)
                    ? getBuiltinComponent(section.type, true)
                    : <CustomSectionRenderer sectionId={section.id} sectionType={section.type as CustomSectionType} />
                  }
                </SectionStyleWrapper>
              </div>
            </EditorSectionCard>
          </React.Fragment>
        ))}
        {enabledSections.length > 0 && (
          <InsertionLine afterSectionId={enabledSections[enabledSections.length - 1].id} />
        )}
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
