import { useBrandsConfig } from '@/hooks/useSectionConfig';
import { useLiveOverride } from '@/hooks/usePreviewBridge';
import { useIsEditorPreview } from '@/hooks/useIsEditorPreview';
import { InlineEditableText } from './InlineEditableText';
import { SectionStyleWrapper } from './SectionStyleWrapper';

export function BrandsSection() {
  const { data: dbConfig, isLoading } = useBrandsConfig();
  const config = useLiveOverride('section_brands', dbConfig);
  const isPreview = useIsEditorPreview();

  // Don't render while loading to prevent flash
  if (isLoading || !config) return null;

  const brands = config.brands;

  return (
    <SectionStyleWrapper styleOverrides={config.style_overrides}>
    <section data-theme="light" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto" style={{ paddingLeft: 'calc(1.5rem + 6px)', paddingRight: 'calc(1.5rem + 6px)' }}>
        <div className="flex items-center">
          {/* Left side text with divider */}
          {config.show_intro_text && (
            <div className="flex-shrink-0 pr-6 md:pr-10 flex items-center">
              <div className="max-w-[180px] md:max-w-[200px]">
                <p 
                  className="text-xs md:text-sm tracking-[0.02em] text-foreground/80 leading-relaxed"
                  style={{ fontFamily: "'Aeonik Pro', sans-serif" }}
                >
                  {isPreview ? (
                    <InlineEditableText
                      value={config.intro_text}
                      sectionKey="section_brands"
                      fieldPath="intro_text"
                      multiline
                      placeholder="Our favorite brands..."
                    />
                  ) : (
                    config.intro_text.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < config.intro_text.split('\n').length - 1 && <br />}
                      </span>
                    ))
                  )}
                </p>
              </div>
              {/* Vertical divider */}
              <div className="ml-6 md:ml-10 h-16 md:h-20 w-px bg-foreground/30" />
            </div>
          )}

          {/* Scrolling logos container with mask */}
          <div 
            className="flex-1 overflow-hidden relative"
            style={{
              maskImage: config.show_intro_text 
                ? 'linear-gradient(to right, transparent 0%, black 5%, black 100%)'
                : 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
              WebkitMaskImage: config.show_intro_text 
                ? 'linear-gradient(to right, transparent 0%, black 5%, black 100%)'
                : 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
            }}
          >
            <div 
              className="flex hover:[animation-play-state:paused]"
              style={{
                animation: `marquee ${config.marquee_speed}s linear infinite`,
              }}
            >
              {/* First set */}
              {brands.map((brand, index) => (
                <span
                  key={index}
                  className="text-lg md:text-xl lg:text-2xl font-medium tracking-[0.1em] text-foreground whitespace-nowrap uppercase flex-shrink-0 px-8 md:px-14 lg:px-18"
                  style={{ fontFamily: "'Termina', sans-serif" }}
                >
                  {brand.display_text}
                </span>
              ))}
              {/* Duplicate set for seamless loop */}
              {brands.map((brand, index) => (
                <span
                  key={`dup-${index}`}
                  className="text-lg md:text-xl lg:text-2xl font-medium tracking-[0.1em] text-foreground whitespace-nowrap uppercase flex-shrink-0 px-8 md:px-14 lg:px-18"
                  style={{ fontFamily: "'Termina', sans-serif" }}
                  aria-hidden="true"
                >
                  {brand.display_text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
    </SectionStyleWrapper>
  );
}
