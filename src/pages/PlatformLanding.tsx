import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { HeroSection } from '@/components/marketing/HeroSection';
import { LogoBar } from '@/components/marketing/LogoBar';
import { ProblemStatement } from '@/components/marketing/ProblemStatement';
import { PlatformPreview } from '@/components/marketing/PlatformPreview';
import { IntelligencePillars } from '@/components/marketing/IntelligencePillars';
import { OutcomeMetrics } from '@/components/marketing/OutcomeMetrics';
import { EcosystemPreview } from '@/components/marketing/EcosystemPreview';
import { TestimonialSection } from '@/components/marketing/TestimonialSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export default function PlatformLanding() {
  return (
    <MarketingLayout>
      <HeroSection />
      <LogoBar />
      <ProblemStatement />
      <PlatformPreview />
      <IntelligencePillars />
      <OutcomeMetrics />
      <EcosystemPreview />
      <TestimonialSection />
      <FinalCTA />
    </MarketingLayout>
  );
}
