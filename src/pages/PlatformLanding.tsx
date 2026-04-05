import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatBar } from '@/components/marketing/StatBar';
import { ProblemStatement } from '@/components/marketing/ProblemStatement';
import { PersonaTargeting } from '@/components/marketing/PersonaTargeting';
import { IntelligencePillars } from '@/components/marketing/IntelligencePillars';
import { BuiltByOperators } from '@/components/marketing/BuiltByOperators';
import { OutcomeMetrics } from '@/components/marketing/OutcomeMetrics';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { TestimonialSection } from '@/components/marketing/TestimonialSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export default function PlatformLanding() {
  return (
    <MarketingLayout>
      <HeroSection />
      <StatBar />
      <ProblemStatement />
      <PersonaTargeting />
      <IntelligencePillars />
      <BuiltByOperators />
      <OutcomeMetrics />
      <FeatureGrid />
      <TestimonialSection />
      <FinalCTA />
    </MarketingLayout>
  );
}
