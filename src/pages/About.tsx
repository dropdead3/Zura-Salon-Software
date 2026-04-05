import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MarketingSEO } from "@/components/marketing/MarketingSEO";
import { AboutHero } from "@/components/about/AboutHero";
import { ValuesSection } from "@/components/about/ValuesSection";
import { StatsSection } from "@/components/about/StatsSection";
import { StorySection } from "@/components/about/StorySection";
import { JoinTeamSection } from "@/components/about/JoinTeamSection";

const About = () => {
  return (
    <MarketingLayout>
      <MarketingSEO 
        title="About Us"
        description="Learn about the team building the salon intelligence platform. Zura is governance infrastructure for scaling operators."
        path="/about"
      />
      <AboutHero />
      <ValuesSection />
      <StatsSection />
      <StorySection />
      <JoinTeamSection />
    </MarketingLayout>
  );
};

export default About;
