import { GitCompare, TrendingUp, ClipboardList, Target, UserPlus, DollarSign } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function MultiLocation() {
  return (
    <SolutionPageTemplate
      eyebrow="For Multi-Location Owners"
      headline="Every location. One standard. Zero guesswork."
      description="You're growing fast. Zura makes sure your systems grow with you — so every location runs the way you designed it."
      items={[
        {
          icon: GitCompare,
          problem: "Every location runs differently",
          solution: "Define how every location should operate. Benchmark performance across locations and catch drift before it costs you.",
          stat: "Reduce cross-location variance by 35%",
        },
        {
          icon: TrendingUp,
          problem: "I can't compare locations fairly",
          solution: "See side-by-side performance across every metric that matters. Identify your best location and replicate what works.",
          stat: "Top-performing locations lift others by 20%",
        },
        {
          icon: ClipboardList,
          problem: "My managers need better tools",
          solution: "Give location managers daily performance clarity and intervention tools. They act faster because they see what matters.",
          stat: "Managers resolve issues 3x faster",
        },
        {
          icon: Target,
          problem: "I'm growing but my systems aren't",
          solution: "Structured workflows, automated onboarding, and performance tracking scale from 2 to 20 locations.",
          stat: "Open new locations 40% faster",
        },
        {
          icon: UserPlus,
          problem: "Onboarding new locations takes too long",
          solution: "Standardized setup flows, pre-built templates, and automated configuration get new locations running on your standards from day one.",
          stat: "Cut onboarding time by 60%",
        },
        {
          icon: DollarSign,
          problem: "Commission and pay are a mess",
          solution: "Set up transparent commission tiers your team can see. Automate calculations so payroll day is simple and dispute-free.",
          stat: "Eliminate 90% of pay disputes",
        },
      ]}
      testimonial={{
        quote: "Our new hires used to take 90 days to get productive. With structured onboarding, we cut that to 30. The training hub changed everything.",
        attribution: "Regional Director",
        detail: "6 locations",
      }}
    />
  );
}
