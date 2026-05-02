/**
 * HeroForeground — pure subcomponent rendering the hero's foreground stack
 * (eyebrow + headline + subheadline + CTAs + consultation notes + consultation
 * dialog) inside a single AnimatePresence wrapper.
 *
 * Why this exists:
 *   The rotator's foreground JSX previously lived inline as ~150 lines of
 *   tightly-coupled motion + InlineEditableText + button + dialog markup.
 *   That mass made the rotator hard to read AND impossible to render in
 *   isolation for tests — exactly the conditions that allowed the legacy
 *   `HeroSection` divergence to ship undetected. Extracting the foreground
 *   into a pure component:
 *
 *     1. Gives us ONE rendering path for the hero foreground, mirroring the
 *        preview-vs-live parity contract already enforced for HeroNotes,
 *        HeroEyebrow, and HeroScrollIndicator.
 *     2. Shrinks the rotator from ~684 lines to ~530 lines, making the
 *        background/rotation concerns easier to follow.
 *     3. Lets future hero variants compose this foreground with different
 *        background layers without re-implementing the foreground stack.
 *
 * Purity contract:
 *   - No router (`useNavigate`/`useLocation`) — the only navigation primitive
 *     is the `<Link>` from react-router-dom which is pure rendering, no hook.
 *   - No DB / context hooks (no `useHeroConfig`, no org context).
 *   - One local state hook (`consultationOpen`) for the consultation dialog
 *     trigger — this is a foreground concern, not a parent concern.
 *   - All scroll-driven motion values are passed in via `scrollFx` so the
 *     component never touches `useScroll` itself. This keeps it renderable
 *     in isolation (Vitest, Storybook, editor preview) without a scroll
 *     container.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConsultationFormDialog } from '@/components/ConsultationFormDialog';
import { HeroEyebrow } from './HeroEyebrow';
import { HeroNotes } from './HeroNotes';
import { HeroRotatingWord } from './HeroRotatingWord';
import { InlineEditableText } from './InlineEditableText';
import type { HeroConfig, HeroSlide } from '@/hooks/useSectionConfig';
import type { ResolvedHeroColors } from '@/lib/heroColors';
import type { HeroAlignmentClasses } from '@/lib/heroAlignment';
import type { HeroSpacingClasses } from '@/lib/heroSpacing';

interface HeroForegroundProps {
  /** Active slide (already merged with section-level shared fields if applicable). */
  slide: HeroSlide;
  /** Section-level config — only consulted for shared globals (notes, rotating words). */
  config: HeroConfig;
  /** Index of the active slide; used as the AnimatePresence key in multi_slide mode. */
  activeIndex: number;
  /** 'background_only' keeps a stable foreground key (no exit/enter); 'multi_slide' rotates per-slide. */
  rotatorMode: 'background_only' | 'multi_slide';
  /** True when rendered inside the website editor canvas (enables InlineEditableText). */
  isPreview: boolean;
  /** Whether the active background is image/video (drives auto-contrast tone). */
  hasBackground: boolean;
  /** Resolved color tokens (already merged section + per-slide overrides). */
  heroColors: ResolvedHeroColors;
  /** Muted tone class (eyebrow + nav share the subheadline tone). */
  mutedTone: string;
  /** Resolved alignment classes (.headline / .subheadline / .cta / .ctaRow / .notes). */
  alignment: HeroAlignmentClasses;
  /** Resolved spacing tokens (eyebrow / subheadline / cta / notesGap). */
  spacing: HeroSpacingClasses;
  /** Rotating-word state (lifted to parent so the interval lives once per section). */
  rotatingWords: string[];
  showRotatingWords: boolean;
  wordIndex: number;
  /** Scroll-driven motion values (null when scroll-fx is disabled). */
  scrollFx: {
    enabled: boolean;
    taglineY: MotionValue<number>;
    headlineY: MotionValue<number>;
    subheadlineY: MotionValue<number>;
    ctaY: MotionValue<number>;
    topLineX: MotionValue<number>;
    bottomLineX: MotionValue<number>;
    headingBlurFilter: MotionValue<string>;
    headlineScrollOpacity: MotionValue<number>;
  };
  /** Ref the parent uses to measure the foreground for stable min-height. */
  contentRef?: React.Ref<HTMLDivElement>;
}

export function HeroForeground({
  slide,
  config,
  activeIndex,
  rotatorMode,
  isPreview,
  hasBackground,
  heroColors,
  mutedTone,
  alignment,
  spacing,
  rotatingWords,
  showRotatingWords,
  wordIndex,
  scrollFx,
  contentRef,
}: HeroForegroundProps) {
  const [consultationOpen, setConsultationOpen] = useState(false);
  const enableScrollFx = scrollFx.enabled;
  const fieldPrefix = rotatorMode === 'background_only' ? '' : `slides.${activeIndex}.`;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={rotatorMode === 'background_only' ? 'fg-shared' : `fg-${activeIndex}`}
        data-hero-foreground={rotatorMode === 'background_only' ? 'shared' : 'per-slide'}
        ref={contentRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className={cn('w-full', alignment.innerWrapper)}
      >
        <motion.div style={enableScrollFx ? { y: scrollFx.taglineY } : undefined}>
          <HeroEyebrow
            show={!!slide.show_eyebrow}
            text={slide.eyebrow}
            toneClass={heroColors.eyebrowToneClass || mutedTone}
            style={heroColors.eyebrowStyle}
            editable={isPreview}
            fieldPath={`${fieldPrefix}eyebrow`}
            className={spacing.eyebrow}
          />
        </motion.div>

        <motion.h1
          className={cn(
            'font-display font-normal leading-[0.95] flex flex-col',
            alignment.headline,
            heroColors.headlineClass,
          )}
          style={{
            fontSize: 'calc(clamp(2.25rem, 8vw, 5.5rem) * var(--section-heading-scale, 1))',
            ...heroColors.headlineStyle,
            ...(enableScrollFx ? { y: scrollFx.headlineY, filter: scrollFx.headingBlurFilter } : {}),
          }}
        >
          {/* eslint-disable-next-line no-restricted-syntax -- headline-line scroll-parallax wrapper, not a rotating-word render. */}
          <motion.span
            className="whitespace-nowrap block"
            style={enableScrollFx ? { x: scrollFx.topLineX, opacity: scrollFx.headlineScrollOpacity } : undefined}
          >
            {isPreview ? (
              <InlineEditableText
                as="span"
                className="whitespace-nowrap block"
                value={slide.headline_text}
                sectionKey="section_hero"
                fieldPath={`${fieldPrefix}headline_text`}
                placeholder="Headline"
              />
            ) : (
              slide.headline_text
            )}
          </motion.span>
          {/* eslint-disable-next-line no-restricted-syntax -- headline-line scroll-parallax wrapper, not a rotating-word render. */}
          <motion.span
            className="block"
            style={enableScrollFx ? { x: scrollFx.bottomLineX, opacity: scrollFx.headlineScrollOpacity } : undefined}
          >
            <HeroRotatingWord
              show={showRotatingWords}
              words={rotatingWords}
              index={wordIndex}
              isOverDark={hasBackground}
              colorOverride={!!heroColors.headlineStyle.color}
            />
          </motion.span>
        </motion.h1>

        {(slide.subheadline_line1 || slide.subheadline_line2) && (
          <motion.p
            className={cn(
              spacing.subheadline,
              'text-sm md:text-base font-sans font-light leading-relaxed',
              alignment.subheadline,
              heroColors.subheadlineClass,
            )}
            style={{ ...heroColors.subheadlineStyle, ...(enableScrollFx ? { y: scrollFx.subheadlineY } : {}) }}
          >
            {isPreview ? (
              <InlineEditableText
                as="span"
                value={slide.subheadline_line1}
                sectionKey="section_hero"
                fieldPath={`${fieldPrefix}subheadline_line1`}
                placeholder="Subheadline line 1"
              />
            ) : (
              slide.subheadline_line1
            )}
            {slide.subheadline_line2 && (
              <>
                <br />
                {isPreview ? (
                  <InlineEditableText
                    as="span"
                    value={slide.subheadline_line2}
                    sectionKey="section_hero"
                    fieldPath={`${fieldPrefix}subheadline_line2`}
                    placeholder="Subheadline line 2"
                  />
                ) : (
                  slide.subheadline_line2
                )}
              </>
            )}
          </motion.p>
        )}

        <motion.div
          className={cn(spacing.cta, 'flex flex-col', spacing.notesGap, alignment.cta)}
          style={enableScrollFx ? { y: scrollFx.ctaY } : undefined}
        >
          <div className={cn('flex flex-col sm:flex-row items-center gap-4', alignment.ctaRow)}>
            <button
              onClick={() => {
                if (slide.cta_new_client_url) {
                  window.location.href = slide.cta_new_client_url;
                } else {
                  setConsultationOpen(true);
                }
              }}
              // eslint-disable-next-line no-restricted-syntax -- inline-flex items-center is button-internal icon+text cross-axis centering, not hero content alignment
              className={cn(
                'group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal rounded-full transition-all duration-300 inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6',
                heroColors.primaryButtonClass,
                heroColors.hasPrimaryHover && 'hero-cta-hover',
                heroColors.hasPrimaryHoverFg && 'hero-cta-hover-fg',
              )}
              style={heroColors.primaryButtonStyle}
            >
              <span className="relative z-10">{slide.cta_new_client || 'Get Started'}</span>
              <ArrowRight className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-300" />
            </button>
            {slide.show_secondary_button && (
              <Link
                to={slide.cta_returning_client_url || '/booking'}
                // eslint-disable-next-line no-restricted-syntax -- inline-flex items-center is button-internal icon+text cross-axis centering, not hero content alignment
                className={cn(
                  'group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border rounded-full transition-all duration-300 inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6',
                  heroColors.secondaryButtonClass,
                  heroColors.hasSecondaryHover && 'hero-cta-hover',
                  heroColors.hasSecondaryHoverBorder && 'hero-cta-hover-border',
                  heroColors.hasSecondaryHoverFg && 'hero-cta-hover-fg',
                )}
                style={heroColors.secondaryButtonStyle}
              >
                <span className="relative z-10">{slide.cta_returning_client || 'Learn More'}</span>
                <ArrowRight className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-300" />
              </Link>
            )}
          </div>
          {config.show_consultation_notes && (config.consultation_note_line1 || config.consultation_note_line2) && (
            <HeroNotes
              alignment={alignment}
              line1={config.consultation_note_line1 ?? ''}
              line2={config.consultation_note_line2 ?? ''}
              toneClass={heroColors.notesToneClass}
              style={heroColors.notesStyle}
            />
          )}
        </motion.div>

        <ConsultationFormDialog open={consultationOpen} onOpenChange={setConsultationOpen} />
      </motion.div>
    </AnimatePresence>
  );
}
