import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatBar } from '@/components/marketing/StatBar';
import { ProblemStatement } from '@/components/marketing/ProblemStatement';
import { SolutionShowcase } from '@/components/marketing/SolutionShowcase';
import { PersonaExplorer } from '@/components/marketing/PersonaExplorer';
import { BuiltByOperators } from '@/components/marketing/BuiltByOperators';
import { OutcomeMetrics } from '@/components/marketing/OutcomeMetrics';
import { TestimonialSection } from '@/components/marketing/TestimonialSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export default function PlatformLanding() {
  return (
    <MarketingLayout>
      <HeroSection />
      <StatBar />
      <ProblemStatement />
      <SolutionShowcase />
      <PersonaTargeting />
      <BuiltByOperators />
      <OutcomeMetrics />
      <TestimonialSection />
      <FinalCTA />
    </MarketingLayout>
  );
}
