import { Eye, Brain, Shield, TrendingUp, UserPlus, GitCompare } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function Enterprise() {
  return (
    <SolutionPageTemplate
      eyebrow="For Enterprise Leaders"
      headline="Portfolio-level visibility. Decision-grade intelligence."
      description="You think in margins, markets, and momentum. Zura gives you the data architecture to match how you make decisions."
      seoTitle="Enterprise Intelligence"
      seoDescription="Portfolio-level visibility and decision-grade intelligence for enterprise salon brands."
      seoPath="/solutions/enterprise"
      items={[
        {
          icon: Eye,
          problem: "I need data across all my markets",
          solution: "Unified dashboards that roll up data across regions and brands. Make portfolio-level decisions with portfolio-level visibility.",
          stat: "Executive decisions backed by real-time data",
        },
        {
          icon: Brain,
          problem: "My reporting doesn't match my decisions",
          solution: "Weekly intelligence briefs ranked by impact — not raw data dumps. See exactly which lever to pull next across your entire brand.",
          stat: "Replace 6+ spreadsheets with one brief",
        },
        {
          icon: Shield,
          problem: "Standards slip without me knowing",
          solution: "Automated monitoring flags when any location deviates from your standards. You intervene early — not after damage is done.",
          stat: "Detect deviations within 48 hours",
        },
        {
          icon: TrendingUp,
          problem: "I need to forecast with confidence",
          solution: "Model scenarios before committing capital. See how pricing changes, new hires, or expansions affect your bottom line.",
          stat: "Forecasts within 5% accuracy",
        },
        {
          icon: GitCompare,
          problem: "Every location runs differently",
          solution: "Define how every location should operate. Benchmark performance and catch drift before it costs you.",
          stat: "Reduce cross-location variance by 35%",
        },
        {
          icon: UserPlus,
          problem: "Onboarding new locations takes too long",
          solution: "Standardized setup flows and automated configuration get new locations running on your standards from day one.",
          stat: "Cut onboarding time by 60%",
        },
      ]}
      testimonial={{
        quote: "We lost three senior stylists in six months. Once we built transparent career paths and commission tiers with Zura, retention flipped.",
        attribution: "Salon Group CEO",
        detail: "8 locations",
      }}
    />
  );
}
