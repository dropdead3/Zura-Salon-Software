import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MarketingSEO } from '@/components/marketing/MarketingSEO';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatBar } from '@/components/marketing/StatBar';
import { LogoBar } from '@/components/marketing/LogoBar';
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
      <MarketingSEO
        title="Salon Intelligence Platform"
        description="Run your salon with clarity. Zura watches your business, spots what's off, and tells you exactly what lever to pull next."
        path="/"
      />
      <HeroSection />
      <StatBar />
      <LogoBar />
      <ProblemStatement />
      <SolutionShowcase />
      <PersonaExplorer />
      <BuiltByOperators />
      <OutcomeMetrics />
      <TestimonialSection />
      <FinalCTA />
    </MarketingLayout>
  );
}
