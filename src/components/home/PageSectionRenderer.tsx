import { useMemo, useEffect } from 'react';
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
import { EditorSectionCard } from '@/components/home/EditorSectionCard';
import { InsertionLine } from '@/components/home/InsertionLine';
import { isBuiltinSection, type BuiltinSectionType, type CustomSectionType, type SectionConfig } from '@/hooks/useWebsiteSections';
import { cn } from '@/lib/utils';

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

interface PageSectionRendererProps {
  sections: SectionConfig[];
}

export function PageSectionRenderer({ sections }: PageSectionRendererProps) {
  const isEditorPreview = useMemo(
    () => new URLSearchParams(window.location.search).has('preview'),
    []
  );

  const enabledSections = useMemo(() => {
    return [...sections]
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);
  }, [sections]);

  // Listen for postMessage from parent (Website Editor) for scroll & highlight
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isEditorPreview && event.origin !== window.location.origin) return;
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
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isEditorPreview]);

  // Public site: render flat (unchanged)
  if (!isEditorPreview) {
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

  // Editor preview: floating bento cards
  return (
    <div className={cn('px-4 sm:px-6 lg:px-8 py-6')}>
      {enabledSections.map((section, index) => (
        <React.Fragment key={section.id}>
          {index > 0 && <InsertionLine afterSectionId={enabledSections[index - 1].id} />}
          <EditorSectionCard
            sectionId={section.id}
            label={section.label}
            enabled={section.enabled}
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
      {/* Final insertion line after last card */}
      {enabledSections.length > 0 && (
        <InsertionLine afterSectionId={enabledSections[enabledSections.length - 1].id} />
      )}
    </div>
  );
}
