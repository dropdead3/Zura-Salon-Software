import { useMemo, useEffect, useState, useCallback } from 'react';
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

// Must be at module level — React.lazy inside render body causes infinite re-suspension
const EditorSectionCard = React.lazy(() =>
  import('@/components/home/EditorSectionCard').then(m => ({ default: m.EditorSectionCard }))
);
const InsertionLine = React.lazy(() =>
  import('@/components/home/InsertionLine').then(m => ({ default: m.InsertionLine }))
);

const BUILTIN_COMPONENTS: Record<BuiltinSectionType, React.ReactNode> = {
  hero: <HeroSection />,
  brand_statement: <BrandStatement />,
  testimonials: <TestimonialSection />,
  services_preview: <ServicesPreview />,
  popular_services: <PopularServices />,
  gallery: <GallerySection />,
  new_client: <NewClientSection />,
  stylists: <StylistsSection />,
  locations: <LocationsSection />,
  faq: <FAQSection />,
  extensions: <ExtensionsSection />,
  brands: <BrandsSection />,
  drink_menu: <DrinkMenuSection />,
};

// Detect editor preview mode (inside iframe)
const isEditorPreview = typeof window !== 'undefined'
  && (new URLSearchParams(window.location.search).has('preview') || new URLSearchParams(window.location.search).has('mode'));

// When mode=view, render the public site exactly (no bento cards)
const isViewMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('mode') === 'view';

interface PageSectionRendererProps {
  sections: SectionConfig[];
}

export function PageSectionRenderer({ sections }: PageSectionRendererProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const enabledSections = useMemo(() => {
    if (isEditorPreview && !isViewMode) {
      // In editor edit mode, show all sections (enabled and disabled) so user can toggle
      return [...sections].sort((a, b) => a.order - b.order);
    }
    return [...sections]
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);
  }, [sections]);

  // Listen for postMessage from parent (Website Editor) for scroll & highlight
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

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
          window.location.origin
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
                ? BUILTIN_COMPONENTS[section.type]
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
      <div className="zura-editor-preview py-6 space-y-5">
        <React.Suspense fallback={null}>
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
                      ? BUILTIN_COMPONENTS[section.type]
                      : <CustomSectionRenderer sectionId={section.id} sectionType={section.type as CustomSectionType} />
                    }
                  </SectionStyleWrapper>
                </div>
              </EditorSectionCard>
            </React.Fragment>
          ))}
          {/* Insertion line after last section */}
          {enabledSections.length > 0 && (
            <InsertionLine afterSectionId={enabledSections[enabledSections.length - 1].id} />
          )}
        </React.Suspense>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
