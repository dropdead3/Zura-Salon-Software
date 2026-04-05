import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MarketingSEO } from '@/components/marketing/MarketingSEO';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatBar } from '@/components/marketing/StatBar';
import { LogoBar } from '@/components/marketing/LogoBar';
import { ChaosToClarity } from '@/components/marketing/ChaosToClarity';
import { SystemWalkthrough } from '@/components/marketing/SystemWalkthrough';
import { PersonaExplorer } from '@/components/marketing/PersonaExplorer';
import { BuiltByOperators } from '@/components/marketing/BuiltByOperators';
import { OutcomeMetrics } from '@/components/marketing/OutcomeMetrics';
import { TestimonialSection } from '@/components/marketing/TestimonialSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { SectionDivider } from '@/components/marketing/SectionDivider';
import { BeforeAfterShowcase } from '@/components/marketing/BeforeAfterShowcase';
import { ToolConsolidation } from '@/components/marketing/ToolConsolidation';
import { StruggleInput } from '@/components/marketing/StruggleInput';

export default function PlatformLanding() {
  return (
    <MarketingLayout>
      <MarketingSEO
        title="Salon Intelligence Platform"
        description="Run your salon with clarity. Zura watches your business, spots what's off, and tells you exactly what lever to pull next."
        path="/"
      />
      <HeroSection />
      <StruggleInput />
      <StatBar />
      <ChaosToClarity />
      <SectionDivider />
      <SystemWalkthrough />
      <LogoBar />
      <PersonaExplorer />
      <SectionDivider />
      <BeforeAfterShowcase />
      <ToolConsolidation />
      <OutcomeMetrics />
      <BuiltByOperators />
      <TestimonialSection />
      <FinalCTA />
    </MarketingLayout>
  );
}
