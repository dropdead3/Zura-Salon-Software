/**
 * HeroSectionRoot — public-facing entry point for the hero section.
 *
 * Replaces the retired `HeroSection.tsx`. All hero rendering now flows
 * through `HeroSlideRotator`, which gracefully handles the empty-slides
 * case by synthesizing a master slide from section-level config. This
 * eliminates the divergent "static hero" code path that carried its own
 * (drift-prone) split-headline implementation.
 */
import { useEffect } from 'react';
import { useHeroConfig, DEFAULT_HERO } from '@/hooks/useSectionConfig';
import { useLiveOverride } from '@/hooks/usePreviewBridge';
import { HeroSlideRotator } from './HeroSlideRotator';
import { publishHeroAlignment, clearHeroAlignment } from '@/lib/heroAlignmentSignal';

interface HeroSectionRootProps {
  isPreview?: boolean;
}

export function HeroSectionRoot({ isPreview = false }: HeroSectionRootProps) {
  const { data: dbHeroConfig } = useHeroConfig();
  const heroConfig = useLiveOverride('section_hero', dbHeroConfig) ?? dbHeroConfig ?? DEFAULT_HERO;

  // Publish section-level alignment for global overlays (promo FAB, etc.)
  // when there are no slides — the rotator owns the per-slide signal when
  // slides are configured, and the section-level value is already what its
  // synthesized master slide inherits in that empty-slides path.
  const effectiveAlignment = heroConfig?.content_alignment ?? 'center';
  const hasConfiguredSlides = (heroConfig?.slides ?? []).some((s) => s.active !== false);
  useEffect(() => {
    if (hasConfiguredSlides) return;
    publishHeroAlignment(effectiveAlignment);
    return () => clearHeroAlignment();
  }, [effectiveAlignment, hasConfiguredSlides]);

  return <HeroSlideRotator config={heroConfig} isPreview={isPreview} />;
}
