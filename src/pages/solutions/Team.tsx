import { Users, DollarSign, GraduationCap, UserPlus, Heart, ClipboardList } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function Team() {
  return (
    <SolutionPageTemplate
      eyebrow="Team Performance"
      headline="Grow the people who grow your business."
      description="Your team is your business. Zura helps you track performance, build career paths, and keep your best people — without micromanaging."
      items={[
        {
          icon: Users,
          problem: "I don't know who's actually performing",
          solution: "See clear performance data for every team member — revenue, retention, rebooking, growth. No more guessing who's doing well.",
          stat: "Managers resolve issues 3x faster",
        },
        {
          icon: DollarSign,
          problem: "Commission and pay are a mess",
          solution: "Set up transparent commission tiers your team can see. Automate calculations so payroll day is simple and dispute-free.",
          stat: "Eliminate 90% of pay disputes",
        },
        {
          icon: GraduationCap,
          problem: "My team has no growth path",
          solution: "Build transparent performance tiers and career levels. Your team sees exactly what it takes to earn more — and stays motivated.",
          stat: "Teams with clear paths retain 2x longer",
        },
        {
          icon: UserPlus,
          problem: "Hiring and keeping great people is hard",
          solution: "Build a culture where top talent stays. Performance tracking and career paths give your team real reasons to grow with you.",
          stat: "Reduce turnover by up to 25%",
        },
        {
          icon: Heart,
          problem: "I lose good people and don't know why",
          solution: "Track engagement signals, flag risk early, and give managers the tools to have better conversations before it's too late.",
        },
        {
          icon: ClipboardList,
          problem: "Onboarding new hires takes forever",
          solution: "Structured onboarding workflows get new team members productive faster with clear expectations from day one.",
          stat: "Cut onboarding time from 90 days to 30",
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
